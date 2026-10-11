# CycleProof backend

Python 3.12 AWS Lambda handlers deployed with AWS SAM: API Gateway → Lambda → DynamoDB (single table) + private S3 evidence bucket, with EventBridge nightly reconciliation, SNS alerts and CloudWatch logs/alarms/tracing.

```
backend/
├── template.yaml              SAM stack (API, table, bucket, 2 functions, SNS, alarms)
├── src/
│   ├── app.py                 router + route handlers + scheduled handler
│   ├── reconciliation.py      pure rules (no AWS) — start here to change detection logic
│   ├── validation.py          input validation + enums (mirror frontend/src/types)
│   └── db.py                  DynamoDB access layer (keys, paging, counters, partial updates)
├── scripts/seed.py            load the demo dataset into a table
├── seed/seed_data.json        demo data exported from frontend/src/data/mockData.ts
└── tests/                     unit tests (rules) + API tests against mocked AWS (moto)
```

## API

Base URL = the `ApiBaseUrl` stack output (`…/v1`). All bodies are JSON. Errors are `{ "error": "message", "details"?: [...] }`.
List endpoints accept `?limit=` (1–1000, default 200) and `?cursor=` and return `{ items, nextCursor? }`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/bootstrap` | Everything the UI needs in one call (claims, organizations, evidence, discrepancies, timeline, notifications) |
| GET / POST | `/organizations` | List / create (`name`, `type`, optional `location`, `registrationId`, `contactName`, `status`) |
| GET | `/organizations/{orgId}` | One organization. `claimIds`, totals, `openDiscrepancies`, `evidenceGaps`, `lastActivityIso` are computed live, never stored |
| GET | `/claims` | List; filter with `status`, `orgId`, `period`, `assignedReviewer` |
| POST | `/claims` | Create (`orgId`, `period`, `claimed` required; optional stage quantities). Ids are sequential: `CP-2026-017` |
| GET | `/claims/{claimId}` | One claim; `?include=related` adds `evidence`, `discrepancies`, `timeline` |
| PATCH | `/claims/{claimId}` | Update `status`, `reviewerNotes`, `assignedReviewer`, `evidenceCount`, and stage quantities. Status/quantity changes are written to the timeline |
| POST | `/claims/{claimId}/reconcile` | Run reconciliation now. Optional `{ "tolerancePct": 0-100 }`. Idempotent |
| GET | `/claims/{claimId}/timeline` | Activity history for the claim |
| POST | `/claims/{claimId}/notes` | Add a review note `{ note, discrepancyId? }` (stored as a `comment_added` timeline event) |
| GET | `/claims/{claimId}/report` | Report data: stages, evidence, discrepancies, timeline, summary, disclaimer |
| POST | `/claims/{claimId}/imports` | Import CSV-derived rows `{ records: [{ reference_id, record_type, quantity_tonnes, date, source }] }` (max 1,000). **All-or-nothing**: any invalid row rejects the batch and `details` lists up to 20 row errors. `record_type` is a stage name; a blank quantity stays `null` |
| GET | `/discrepancies` | List; filter with `claimId`, `status`, `type`, `orgId` |
| GET / PATCH | `/discrepancies/{id}` | Read / update `status` and `reviewerNotes` (human decisions; sets `reviewedAt`, `resolvedAt`) |
| GET | `/notifications` | List (`?unread=true`) |
| PATCH | `/notifications/{id}` | `{ "read": true\|false }` |
| POST | `/notifications/read-all` | Mark everything read |
| GET | `/evidence` | List (`?claimId=`) |
| POST | `/evidence/upload-url` | Step 1 of upload. Body: `claimId`, `filename`, `contentType` (csv/pdf/png/jpeg), `sizeBytes` (≤ 25 MB), optional `type`, `stage`, `reference`, `quantityTonnes`, `source`, `date`. Returns a 5-minute presigned **PUT** URL. The declared size is part of the signature, so S3 rejects a different size |
| POST | `/evidence/{id}/complete` | Step 3: verifies the object exists in S3 with the declared size, marks it attached, updates counts and timeline |
| GET | `/evidence/{id}/download-url` | 5-minute presigned download URL (only after upload is complete) |

Upload flow: `upload-url` → `PUT` the file to `uploadUrl` with the returned `headers` → `complete`. `frontend/src/services/api.ts` has `api.uploadEvidence()` which does all three.

## Reconciliation rules (`src/reconciliation.py`)

Findings are **review signals, not proof of fraud**; humans decide. Every finding carries the compared values, the tolerance, and a plain-language explanation. Missing data is never treated as zero, and zero denominators are skipped.

| Type | Triggered when |
| --- | --- |
| Quantity Mismatch | Two compatible values differ by more than the tolerance (default 5%): claimed↔collected, then each adjacent stage collected→received→processed→recovered→dispatched. Both values must exist |
| Missing Evidence | An evidence record is marked `missing`, or a stage has a reported quantity but no attached evidence for that stage |
| Duplicate Record | Same reference appears more than once at the same stage within a claim |
| Date Inconsistency | The earliest evidence of a later stage predates the earliest evidence of an earlier stage, or evidence is dated in the future |

Each finding has a deterministic id (hash of claim + rule fingerprint), so reruns never create duplicates. A finding a reviewer has marked **Resolved** is not recreated. The nightly job (02:00 UTC) checks every claim that is not `Reconciled`, then publishes one SNS alert if anything new was found.

## Data model

One table, keys `PK`/`SK` (`SK = "META"`), e.g. `CLAIM#CP-2026-001`, `EVIDENCE#ev-…`, `DISCREPANCY#disc-…`.

- **GSI1** (`GSI1PK` = entity type): list everything of a kind, newest first.
- **GSI2** (`GSI2PK` = `CLAIM#<id>`): everything that belongs to a claim (evidence, discrepancies, timeline, notifications) in one query.
- `COUNTER#…` items hold the sequential id counters.

## Local checks

```bash
python -m pip install -r requirements-dev.txt     # boto3 + moto for the API tests
python -m unittest discover -s tests -v           # rule tests + API tests against mocked AWS
sam validate && sam build
```

The rule tests need no dependencies. The API tests are skipped automatically if `moto` isn't installed. `sam local start-api` needs Docker and AWS-backed routes need real resources/credentials.

## Deployment

```bash
cp samconfig.toml.example samconfig.toml        # edit region / AllowedOrigin
sam build
sam deploy --guided                              # first time
```

Parameters: `AppEnvironment` (dev/staging/prod), `AllowedOrigin` (exact frontend origin; used for API and bucket CORS), `DiscrepancyTolerancePct`. Deploying creates billable resources. Put the `ApiBaseUrl` output in the frontend's `VITE_API_BASE_URL`.

> Upgrading an older stack: this version adds a second GSI (`GSI2`). CloudFormation can add it in place; items written by the old version will not appear in claim-scoped queries (evidence/timeline per claim) until they are rewritten. For a dev stack, redeploying fresh and re-seeding is simpler.

## Seeding demo data

The API never inserts demo data on its own. To load the same dataset the frontend uses:

```bash
export AWS_PROFILE=<profile> AWS_REGION=ap-south-1
python scripts/seed.py --table cycleproof-dev-records          # dry run
python scripts/seed.py --table cycleproof-dev-records --yes    # write
```

It refuses a table that already has claims (unless `--force`), tags every record `demo: true`, and advances the id counters so new claims/organizations don't collide with seeded ones. The first nightly run after seeding will add some automated findings alongside the hand-written demo ones.

To regenerate `seed/seed_data.json` after editing `mockData.ts`, bundle that file with esbuild and dump `INITIAL_ORGS`, `INITIAL_CLAIMS`, `INITIAL_EVIDENCE`, `INITIAL_DISCREPANCIES`, `INITIAL_TIMELINE`, `INITIAL_NOTIFICATIONS` as JSON under the keys `organizations`, `claims`, `evidence`, `discrepancies`, `timeline`, `notifications`.

## Before production

- **No authentication or tenant isolation.** Anyone who can reach the API can read and change everything. Add Cognito (or another identity provider) with an API Gateway authorizer, and scope data per organization, before using real data. CORS and validation are not authorization. Review/actor names on the timeline are generic ("Reviewer") until identities exist.
- Tolerance is one global percentage. Processing and recovery legitimately lose mass, so a flat 5% will flag normal yield loss; agree per-stage tolerances with domain experts.
- Uploads are limited to CSV/PDF/PNG/JPEG and 25 MB by declaration only: add malware scanning and content verification for untrusted files.
- `/bootstrap` and org endpoints load full collections (capped at 5,000 per type): fine for a starter, move to paginated/filtered reads at scale.
- Review IAM policies, log/data retention, and the bucket/table deletion behaviour for your environment. Subscribe an email/endpoint to the SNS topic and confirm it.
