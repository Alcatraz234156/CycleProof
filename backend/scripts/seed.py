#!/usr/bin/env python3
"""Load the demo dataset (exported from frontend/src/data/mockData.ts) into DynamoDB.

Safe by default:
  * dry run unless --yes is passed
  * refuses to write into a table that already has claims, unless --force
  * every record is tagged  demo: true  so it is never mistaken for real data

Usage (from backend/):
  export AWS_PROFILE=...  AWS_REGION=ap-south-1
  python scripts/seed.py --table cycleproof-dev-records            # dry run
  python scripts/seed.py --table cycleproof-dev-records --yes      # write

Re-export the JSON after editing mockData.ts:  see backend/README.md ("Seeding demo data").
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

# (kind, key in seed file, field used as sort timestamp)
ENTITIES = [
    ("organization", "organizations", None),
    ("claim", "claims", "submittedIso"),
    ("evidence", "evidence", "dateIso"),
    ("discrepancy", "discrepancies", "detectedAt"),
    ("timeline", "timeline", "timestamp"),
    ("notification", "notifications", "timestamp"),
]
# Computed live by the API from claims/discrepancies, so they are not stored.
DERIVED_ORG_FIELDS = {"claimIds", "totalClaimedTonnes", "totalRecordedTonnes", "openDiscrepancies",
                      "evidenceGaps", "lastActivityIso"}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--table", default=os.environ.get("TABLE_NAME"), help="DynamoDB table name (or set TABLE_NAME)")
    parser.add_argument("--region", default=None)
    parser.add_argument("--file", default=str(ROOT / "seed" / "seed_data.json"))
    parser.add_argument("--yes", action="store_true", help="actually write (otherwise dry run)")
    parser.add_argument("--force", action="store_true", help="write even if the table already has claims")
    args = parser.parse_args()
    if not args.table:
        parser.error("--table (or TABLE_NAME) is required")

    os.environ["TABLE_NAME"] = args.table
    if args.region:
        os.environ["AWS_REGION"] = args.region
    import db  # imported after env is set

    data = json.loads(pathlib.Path(args.file).read_text())
    counts = {key: len(data.get(key, [])) for _, key, _ in ENTITIES}
    print(f"Seed file: {args.file}\nTarget table: {args.table}\nRecords: {counts}")

    if not args.yes:
        print("\nDry run. Nothing written. Re-run with --yes to write.")
        return 0

    existing, _ = db.list_kind("claim", limit=1)
    if existing and not args.force:
        print("\nRefusing: the table already contains claims. Use --force if you really want to add the demo data.", file=sys.stderr)
        return 2

    written = 0
    for kind, key, ts_field in ENTITIES:
        items = []
        for raw in data.get(key, []):
            item = dict(raw)
            if kind == "organization":
                item = {k: v for k, v in item.items() if k not in DERIVED_ORG_FIELDS}
            item["demo"] = True
            ts = item.get(ts_field) if ts_field else None
            if ts:
                item["createdAt"] = ts
            items.append((item, ts))
        # put() one at a time keeps per-kind sort keys correct; the dataset is tiny.
        for item, ts in items:
            db.put(kind, item, item["id"], sort_ts=ts)
            written += 1
        print(f"  wrote {len(items):>3} {kind}")

    # Make sure new records created through the API never collide with seeded ids.
    claim_max: dict[str, int] = {}
    for claim in data.get("claims", []):
        m = re.fullmatch(r"CP-(\d{4})-(\d+)", claim["id"])
        if m:
            claim_max[m.group(1)] = max(claim_max.get(m.group(1), 0), int(m.group(2)))
    for year, number in claim_max.items():
        db.raise_counter_to(f"claim-{year}", number)
    org_numbers = [int(m.group(1)) for o in data.get("organizations", [])
                   if (m := re.fullmatch(r"org-(\d+)", o["id"]))]
    if org_numbers:
        db.raise_counter_to("organization", max(org_numbers))

    print(f"\nDone: {written} records written (tagged demo=true).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
