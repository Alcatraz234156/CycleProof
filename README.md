<div align="center">

<img src="assets/banner.svg" alt="CycleProof: environmental claim reconciliation for the e-waste recycling chain" width="100%">

<br>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=21&pause=1200&color=2EE6A0&center=true&vCenter=true&width=700&height=45&lines=Follow+the+material.;Compare+the+records.;Investigate+the+gaps.;Support+transparent+reporting." alt="Typing animation: Follow the material. Compare the records. Investigate the gaps.">

<br>

<img src="https://img.shields.io/badge/status-full--stack%20application-2ee6a0?style=for-the-badge" alt="Full-stack application">
<img src="https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-5ad7f0?style=for-the-badge&logo=react&logoColor=white" alt="React and TypeScript">
<img src="https://img.shields.io/badge/backend-Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
<img src="https://img.shields.io/badge/cloud-AWS-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS">

<br>

<img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
<img src="https://img.shields.io/badge/AWS%20SAM-serverless-FF9900?style=flat-square" alt="AWS SAM">
<img src="https://img.shields.io/badge/Lambda-API%20Gateway-FF9900?style=flat-square&logo=awslambda&logoColor=white" alt="Lambda and API Gateway">
<img src="https://img.shields.io/badge/DynamoDB-%2B%20S3-4053D6?style=flat-square&logo=amazondynamodb&logoColor=white" alt="DynamoDB and S3">
<img src="https://img.shields.io/badge/Node-18%2B-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node 18+">

<br><br>

**[<img src="assets/icons/overview.svg" height="18" align="absmiddle" alt=""> Overview](#-overview)** &nbsp;•&nbsp;
**[<img src="assets/icons/sparkle.svg" height="18" align="absmiddle" alt=""> Features](#-features)** &nbsp;•&nbsp;
**[<img src="assets/icons/layers.svg" height="18" align="absmiddle" alt=""> Architecture](#-system-architecture)** &nbsp;•&nbsp;
**[<img src="assets/icons/rocket.svg" height="18" align="absmiddle" alt=""> Get started](#-getting-started)** &nbsp;•&nbsp;
**[<img src="assets/icons/cloud.svg" height="18" align="absmiddle" alt=""> Deploy](#-aws-deployment)** &nbsp;•&nbsp;
**[<img src="assets/icons/plug.svg" height="18" align="absmiddle" alt=""> API](#-api-reference)** &nbsp;•&nbsp;
**[<img src="assets/icons/lock.svg" height="18" align="absmiddle" alt=""> Security](#-security-and-privacy)**

</div>

<br>

> [!IMPORTANT]
> A discrepancy is a **signal for investigation, not proof of fraud**. CycleProof supports evidence-based human review. It does not automatically establish that an environmental claim is true or false.

> [!NOTE]
> **Integration status:** the AWS backend in `backend/` defines the API and its services in AWS SAM. The browser UI is still **local-first by default**, so persisting UI actions to AWS needs the frontend service and state integration to be completed (see [Current status](#-current-status)).

<details>
<summary><b><img src="assets/icons/list.svg" height="22" align="absmiddle" alt=""> &nbsp;Table of contents</b></summary>

<br>

- [Overview](#-overview)
- [The problem](#-the-problem)
- [The solution](#-the-solution)
- [Features](#-features)
- [Current status](#-current-status)
- [How it works](#-how-it-works)
- [System architecture](#-system-architecture)
- [Technology stack](#-technology-stack)
- [Project structure](#-project-structure)
- [Getting started](#-getting-started)
- [Environment configuration](#-environment-configuration)
- [Running locally](#-running-locally)
- [AWS deployment](#-aws-deployment)
- [API reference](#-api-reference)
- [Data model](#-data-model)
- [AWS services](#-aws-services)
- [Security and privacy](#-security-and-privacy)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Disclaimer](#-disclaimer)

</details>

<img src="assets/divider.svg" alt="" width="100%">

## <img src="assets/icons/overview.svg" height="32" align="absmiddle" alt=""> Overview

CycleProof is a **full-stack environmental claim reconciliation platform** for the electronic-waste (e-waste) recycling chain. It helps organizations and reviewers compare reported material quantities with operational records, inspect supporting evidence, identify missing documentation, and investigate inconsistencies across the material lifecycle.

A recycling claim may describe material **collected, received at a facility, processed, recovered, or dispatched**. Those records can be produced by different organizations and stored in different formats. CycleProof brings claims, evidence, material-flow records, discrepancy findings, and review history into one unified workflow.

<div align="center">
  <img src="assets/material-journey.svg" alt="Material journey: Collected, Received, Processed, Recovered, Dispatched" width="100%">
</div>

<br>

The application combines a **web frontend** with a **cloud backend**. The frontend provides dashboards and review tools. The backend exposes APIs, stores application records, and manages evidence files using AWS services.

## <img src="assets/icons/target.svg" height="32" align="absmiddle" alt=""> The problem

Environmental and recycling claims are hard to evaluate when supporting records are fragmented across spreadsheets, documents, organizations, and facilities. Reviewers may have to compare multiple quantities and references by hand to determine:

| | Question |
| :-: | --- |
| <img src="assets/icons/scales.svg" height="28" align="absmiddle" alt=""> | Whether reported quantities **align** across the recycling chain |
| <img src="assets/icons/clip.svg" height="28" align="absmiddle" alt=""> | Whether the **evidence** needed to support a claim is present |
| <img src="assets/icons/dashed.svg" height="28" align="absmiddle" alt=""> | Where an **unexplained difference** appears |
| <img src="assets/icons/copy.svg" height="28" align="absmiddle" alt=""> | Whether records contain **duplicate or inconsistent** information |
| <img src="assets/icons/clipboard.svg" height="28" align="absmiddle" alt=""> | Which claims **need review**, and what actions have already been taken |

That process is slow and hard to audit when records and explanations are scattered.

## <img src="assets/icons/bulb.svg" height="32" align="absmiddle" alt=""> The solution

CycleProof organizes the process around three connected concepts.

<table>
<tr>
<td width="33%" valign="top">

### <img src="assets/icons/tag.svg" height="26" align="absmiddle" alt=""> Claims
Reported environmental or material-handling **quantities**.

</td>
<td width="33%" valign="top">

### <img src="assets/icons/clip.svg" height="26" align="absmiddle" alt=""> Evidence and records
The **documents and operational records** used to support those claims.

</td>
<td width="33%" valign="top">

### <img src="assets/icons/scales.svg" height="26" align="absmiddle" alt=""> Reconciliation and review
**Comparisons** that surface inconsistencies and help reviewers document their conclusions.

</td>
</tr>
</table>

The system keeps the relationships between claims, organizations, material stages, evidence, discrepancies, and review events, so a user can investigate an issue without losing the context behind it.

<img src="assets/divider.svg" alt="" width="100%">

## <img src="assets/icons/sparkle.svg" height="32" align="absmiddle" alt=""> Features

| | Feature | What it does |
| :-: | --- | --- |
| <img src="assets/icons/bars.svg" height="28" align="absmiddle" alt=""> | **Dashboard** | Claims, pending reviews, evidence gaps, open discrepancies, and recent activity in one view |
| <img src="assets/icons/search.svg" height="28" align="absmiddle" alt=""> | **Claims explorer** | Search, filter, sort, and inspect claims by organization, material, period, review status, and more |
| <img src="assets/icons/doc.svg" height="28" align="absmiddle" alt=""> | **Claim details** | A full workspace: reported quantities, evidence, reconciliation results, discrepancies, notes, and history |
| <img src="assets/icons/journey.svg" height="28" align="absmiddle" alt=""> | **Material journey** | Follow Collected → Received → Processed → Recovered → Dispatched and see where information stops reconciling |
| <img src="assets/icons/scales.svg" height="28" align="absmiddle" alt=""> | **Discrepancy explorer** | Quantity mismatches, missing evidence, possible duplicates, and inconsistent dates or identifiers, each with its comparison, explanation, status, and source records |
| <img src="assets/icons/clip.svg" height="28" align="absmiddle" alt=""> | **Evidence management** | Upload and manage supporting documents, link them to claims or stages, and import structured CSV records with validation and preview |
| <img src="assets/icons/factory.svg" height="28" align="absmiddle" alt=""> | **Organizations and facilities** | Profiles for collection centers, recyclers, processing, recovery, and dispatch sites, with their claims and review history |
| <img src="assets/icons/clock.svg" height="28" align="absmiddle" alt=""> | **Activity timeline** | Evidence changes, quantity updates, review notes, and status transitions in order |
| <img src="assets/icons/bell.svg" height="28" align="absmiddle" alt=""> | **Notifications** | Review tasks, new discrepancies, missing evidence, and other items needing attention |
| <img src="assets/icons/trending.svg" height="28" align="absmiddle" alt=""> | **Analytics and reporting** | Reconciliation outcomes, quantities, evidence completeness, and discrepancy trends, with claim-level and filtered reports |
| <img src="assets/icons/gear.svg" height="28" align="absmiddle" alt=""> | **Settings and onboarding** | Preferences, reconciliation thresholds where authorized, and a walkthrough of the review workflow |
| <img src="assets/icons/usercheck.svg" height="28" align="absmiddle" alt=""> | **Human-centered review** | Reviewers add explanations, request information, update statuses, and record outcomes. Automated flags stay separate from human decisions |

> [!NOTE]
> Production audit guarantees for the activity timeline depend on the deployed implementation and configuration.

## <img src="assets/icons/pin.svg" height="32" align="absmiddle" alt=""> Current status

| Area | State |
| --- | --- |
| **Backend infrastructure** | The AWS SAM starter in `backend/` defines API Gateway, Lambda, DynamoDB, S3, EventBridge, CloudWatch, and SNS |
| **API routes** | Health, bootstrap, claims, discrepancies, notifications, evidence import, and presigned evidence URLs are defined (see [API reference](#-api-reference)) |
| **Frontend** | Full review UI running on local mock records by default |
| **Frontend ↔ backend** | Set `VITE_API_BASE_URL` to the deployed API and complete the service and state integration before UI actions persist to AWS. The frontend's mock records are **not** automatically uploaded to DynamoDB |
| **Not yet included** | An identity provider, complete user authorization, email subscriptions, malware scanning, and a production audit guarantee |

## <img src="assets/icons/cycle.svg" height="32" align="absmiddle" alt=""> How it works

```mermaid
flowchart LR
    A[1 · Create or<br/>import a claim] --> B[2 · Attach records<br/>and evidence]
    B --> C[3 · Reconcile<br/>quantities]
    C --> D[4 · Investigate<br/>flagged differences]
    D --> E[5 · Record a<br/>review outcome]
    E --> F[6 · Track<br/>the history]
    F --> G[7 · Generate<br/>a report]

    style A fill:#b8f05a,stroke:#0b1f1a,color:#0b1f1a
    style B fill:#8fe97b,stroke:#0b1f1a,color:#0b1f1a
    style C fill:#2ee6a0,stroke:#0b1f1a,color:#0b1f1a
    style D fill:#ffe3b0,stroke:#ffb020,color:#0b1f1a
    style E fill:#3fd6c8,stroke:#0b1f1a,color:#0b1f1a
    style F fill:#5ad7f0,stroke:#0b1f1a,color:#0b1f1a
    style G fill:#9dbcff,stroke:#0b1f1a,color:#0b1f1a
```

1. **Create or import a claim.** Capture the organization, reporting period, material, and claimed quantities.
2. **Attach records and evidence.** Associate operational records and documents with the claim and the relevant material stages.
3. **Reconcile available quantities.** Compare compatible values across the material journey using configured rules.
4. **Investigate flagged differences.** Review the values, source records, missing evidence, and explanation for each finding.
5. **Record a review outcome.** Add notes, request more information, or update the discrepancy and claim status.
6. **Track the history.** Inspect relevant activity and notification records.
7. **Generate a report.** Export or print a summary of the claim, reconciliation, evidence, and review outcome.

## <img src="assets/icons/layers.svg" height="32" align="absmiddle" alt=""> System architecture

CycleProof uses a client-server architecture. The browser application talks to an API, and backend functions validate requests and interact with persistent storage.

```mermaid
flowchart TB
    Web["React + TypeScript frontend"]
    GW["Amazon API Gateway"]
    FN["AWS Lambda · Python"]
    DB[("Amazon DynamoDB<br/>claims, evidence metadata, reviews")]
    S3[("Amazon S3<br/>private evidence files")]
    EB["Amazon EventBridge<br/>scheduled reconciliation"]
    CW["Amazon CloudWatch<br/>logs, metrics, alarms"]
    SNS["Amazon SNS<br/>review alerts"]

    Web -- "HTTPS / JSON" --> GW
    GW --> FN
    FN --> DB
    FN --> S3
    EB -- "scheduled trigger" --> FN
    FN -- "publish alert" --> SNS
    FN -. "logs / metrics / traces" .-> CW
    GW -. "API metrics" .-> CW

    style Web fill:#5ad7f0,stroke:#0b1f1a,color:#0b1f1a
    style GW fill:#ffe3b0,stroke:#FF9900,color:#0b1f1a
    style FN fill:#FF9900,stroke:#0b1f1a,color:#0b1f1a
    style DB fill:#d8defc,stroke:#4053D6,color:#0b1f1a
    style S3 fill:#d6f7f4,stroke:#2ee6a0,color:#0b1f1a
    style EB fill:#d6f7f4,stroke:#2ee6a0,color:#0b1f1a
    style CW fill:#d8defc,stroke:#4053D6,color:#0b1f1a
    style SNS fill:#ffe3b0,stroke:#FF9900,color:#0b1f1a
```

> [!NOTE]
> The backend starter in `backend/` defines these seven AWS services in AWS SAM. Verify the deployed stack and outputs before describing the cloud environment as live. Authentication and tenant-level authorization must be added before using real organizational data.

<details>
<summary><b><img src="assets/icons/upload.svg" height="22" align="absmiddle" alt=""> &nbsp;Flow: evidence upload</b></summary>

<br>

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant A as API Gateway + Lambda
    participant S as Amazon S3
    participant D as DynamoDB

    B->>A: POST /evidence/upload-url
    A-->>B: Short-lived presigned upload URL
    B->>S: Upload file with the presigned URL
    A->>D: Store evidence metadata
    B->>A: GET /evidence/{id}/download-url
    A-->>B: Short-lived presigned download URL
```

The bucket is private, versioned, encrypted, and blocks public access, so the browser never receives standing access to evidence files.

</details>

<details>
<summary><b><img src="assets/icons/clock.svg" height="22" align="absmiddle" alt=""> &nbsp;Flow: scheduled reconciliation</b></summary>

<br>

```mermaid
sequenceDiagram
    autonumber
    participant E as EventBridge (daily, 02:00 UTC default)
    participant L as Reconciliation Lambda
    participant D as DynamoDB
    participant N as Amazon SNS
    participant C as CloudWatch

    E->>L: Scheduled trigger
    L->>D: Read claims and records
    L->>L: Compare quantities with configured rules
    L->>D: Record scheduled findings
    L->>N: Publish alert for new discrepancy signals
    L-->>C: Logs, metrics, traces
```

SNS only publishes. Add and confirm an email or other endpoint subscription in the AWS console to receive alerts.

</details>

<img src="assets/divider.svg" alt="" width="100%">

## <img src="assets/icons/toolbox.svg" height="32" align="absmiddle" alt=""> Technology stack

<img src="https://skillicons.dev/icons?i=react,ts,vite,css,python,aws,dynamodb,docker,git&perline=9" alt="React, TypeScript, Vite, CSS, Python, AWS, DynamoDB, Docker, Git">

<table>
<tr>
<td width="33%" valign="top">

### <img src="assets/icons/monitor.svg" height="26" align="absmiddle" alt=""> Frontend
- React
- TypeScript
- Vite
- CSS and reusable UI components

</td>
<td width="33%" valign="top">

### <img src="assets/icons/cloud.svg" height="26" align="absmiddle" alt=""> Backend
- Python
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon S3
- Amazon EventBridge for scheduled reconciliation
- Amazon CloudWatch for logs, metrics, and tracing
- Amazon SNS for alert delivery
- AWS SAM for infrastructure definition and deployment

</td>
<td width="33%" valign="top">

### <img src="assets/icons/wrench.svg" height="26" align="absmiddle" alt=""> Dev and testing
- Node.js and npm
- Python and pip
- AWS SAM CLI
- Docker, where the local SAM build needs it
- Git

</td>
</tr>
</table>

Refer to the repository manifests and the SAM template for exact dependency versions and configured resources.

## <img src="assets/icons/folder.svg" height="32" align="absmiddle" alt=""> Project structure

The repository contains a frontend application and an AWS SAM backend.

<details>
<summary><b>Expand the tree</b></summary>

<br>

```text
CycleProof/
├── README.md
├── assets/                 # README graphics
├── backend/
│   ├── template.yaml       # AWS SAM resources and API routes
│   ├── requirements.txt
│   ├── src/app.py          # Lambda handlers
│   ├── tests/
│   └── README.md
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── vite.config.ts
    └── src/
        ├── components/
        ├── services/
        ├── types/
        ├── App.tsx
        └── main.tsx
```

File names may differ as the project evolves. Use the actual repository files as the source of truth.

</details>

## <img src="assets/icons/rocket.svg" height="32" align="absmiddle" alt=""> Getting started

<details open>
<summary><b>1 · Prerequisites</b></summary>

<br>

- **Node.js 18** or newer, and npm
- A **Python** version supported by the Lambda runtime configured in the SAM template
- **AWS SAM CLI**
- **Docker**, if your SAM build configuration requires it
- **AWS CLI**, for deployment
- An **AWS account** and credentials with permissions appropriate to the resources being deployed

```bash
node --version
npm --version
python --version
sam --version
aws --version
docker --version
```

A tool is only required for the commands that use it. Docker is not necessary for every SAM workflow.

</details>

<details open>
<summary><b>2 · Get the source code</b></summary>

<br>

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_REPOSITORY_DIRECTORY>
```

Replace the placeholders with your repository URL and directory.

</details>

## <img src="assets/icons/gear.svg" height="32" align="absmiddle" alt=""> Environment configuration

The frontend needs the base URL of the deployed or locally running API. Use the variable name the application already expects. For a Vite frontend, a common convention is:

```bash
VITE_API_BASE_URL=http://127.0.0.1:3000
```

For a deployed environment, set it to the API Gateway URL from the deployment outputs. The URL above is illustrative, since the actual local API URL depends on the configured SAM template.

The backend should get resource names and runtime configuration from environment variables or the SAM template. Typical settings:

- DynamoDB table names
- S3 evidence bucket name
- Application environment
- Logging level
- Any explicitly configured reconciliation thresholds
- The reconciliation schedule (daily at 02:00 UTC by default) and the SNS alert topic

> [!CAUTION]
> Do not commit secrets, AWS access keys, credentials, private evidence, or production environment files. Prefer IAM roles and managed secret storage. Never put secrets in `VITE_*` variables, because they are bundled into client-side code.

## <img src="assets/icons/laptop.svg" height="32" align="absmiddle" alt=""> Running locally

<details open>
<summary><b><img src="assets/icons/monitor.svg" height="22" align="absmiddle" alt=""> &nbsp;Frontend</b></summary>

<br>

```bash
cd frontend
npm install
npm run dev        # start the dev server
npm run build      # type-check and create a production bundle
```

Open the local URL printed by Vite in the terminal.

</details>

<details open>
<summary><b><img src="assets/icons/cloud.svg" height="22" align="absmiddle" alt=""> &nbsp;Backend</b></summary>

<br>

Open a separate terminal at the directory containing `template.yaml`. See `backend/README.md` for backend-specific notes.

```bash
cd backend
sam validate
sam build
sam local start-api   # if the template defines a local API via API Gateway events
```

SAM prints the local endpoint. Point the frontend's API base URL at the endpoint and port your environment uses.

> [!NOTE]
> Local functions may still need valid resource configuration or test data. Local execution does not create or populate cloud resources automatically.

</details>

## <img src="assets/icons/cloud.svg" height="32" align="absmiddle" alt=""> AWS deployment

> [!WARNING]
> Deploying creates or updates cloud resources and may incur AWS charges. Review the template, permissions, region, and expected costs before proceeding.

<details>
<summary><b>1 · Configure AWS credentials</b></summary>

<br>

Configure a suitable AWS CLI profile using your organization's approved method, then verify the identity and region before deploying.

```bash
aws sts get-caller-identity
aws configure list
```

Avoid pasting access keys into source code or README files.

</details>

<details>
<summary><b>2 · Validate and build</b></summary>

<br>

From the `backend` directory:

```bash
sam validate
sam build
```

Resolve template and build errors before deploying.

</details>

<details>
<summary><b>3 · Deploy</b></summary>

<br>

First-time guided deployment:

```bash
sam deploy --guided
```

Follow the prompts for stack name, AWS Region, deployment permissions, and template parameters. Review the generated configuration file before committing it, especially if it holds environment-specific information.

For later deployments, if the saved configuration is appropriate:

```bash
sam deploy
```

</details>

<details>
<summary><b>4 · Configure the frontend</b></summary>

<br>

Copy the API base URL from the deployment outputs or the API Gateway console, set the frontend environment variable to it, and rebuild:

```bash
npm run build
```

Deploy the resulting static frontend with the hosting approach chosen for the project. Static hosting is a separate step unless the SAM template explicitly defines it.

</details>

<details>
<summary><b>5 · Subscribe to alerts</b></summary>

<br>

The stack creates an SNS topic for review alerts but no subscribers. In the AWS console, add an email or other endpoint subscription to the topic and confirm it. Without a confirmed subscription, scheduled-reconciliation alerts have nowhere to go.

</details>

<details>
<summary><b>6 · Verify the deployment</b></summary>

<br>

Test the deployed API and frontend with **non-sensitive sample data**, and confirm that:

- [ ] API routes return the expected status codes and response formats
- [ ] Lambda functions can access only the resources they need
- [ ] DynamoDB operations persist and retrieve the expected records
- [ ] Evidence upload and retrieval follow the configured access controls
- [ ] Browser requests work with the intended CORS configuration
- [ ] Logs are useful for diagnosis without exposing sensitive data
- [ ] The scheduled reconciliation runs and its logs appear in CloudWatch
- [ ] A confirmed SNS subscription receives a test alert

</details>

<details>
<summary><b>7 · Clean up test resources</b></summary>

<br>

If the deployment is only a disposable test, review the stack and its retained resources before deleting it. Cloud resources, data, or buckets may have retention policies or deletion protections.

```bash
sam delete
```

Use this only when you understand which resources the stack will remove and have backed up any data you need.

</details>

<img src="assets/divider.svg" alt="" width="100%">

## <img src="assets/icons/plug.svg" height="32" align="absmiddle" alt=""> API reference

The AWS SAM starter currently defines these routes. The route definitions in `backend/template.yaml` and `backend/src/app.py` are the authoritative reference.

| Method | Route | Purpose |
| :-: | --- | --- |
| ![GET](https://img.shields.io/badge/GET-5ad7f0?style=flat-square) | `/health` | Health check |
| ![GET](https://img.shields.io/badge/GET-5ad7f0?style=flat-square) | `/bootstrap` | Load the main application datasets |
| ![GET](https://img.shields.io/badge/GET-5ad7f0?style=flat-square) | `/claims` and `/claims/{claimId}` | List and inspect claims |
| ![PATCH](https://img.shields.io/badge/PATCH-ffb020?style=flat-square) | `/claims/{claimId}` | Update claim status, reviewer notes, or reviewer assignment |
| ![POST](https://img.shields.io/badge/POST-2ee6a0?style=flat-square) | `/claims/{claimId}/imports` | Import structured CSV-derived evidence rows |
| ![GET](https://img.shields.io/badge/GET-5ad7f0?style=flat-square) | `/discrepancies` | List discrepancy records |
| ![PATCH](https://img.shields.io/badge/PATCH-ffb020?style=flat-square) | `/discrepancies/{discrepancyId}` | Update discrepancy status and reviewer notes |
| ![GET](https://img.shields.io/badge/GET-5ad7f0?style=flat-square) | `/notifications` | List notifications |
| ![PATCH](https://img.shields.io/badge/PATCH-ffb020?style=flat-square) | `/notifications/{notificationId}` | Mark a notification read or unread |
| ![POST](https://img.shields.io/badge/POST-2ee6a0?style=flat-square) | `/evidence/upload-url` | Request a short-lived presigned S3 upload URL |
| ![GET](https://img.shields.io/badge/GET-5ad7f0?style=flat-square) | `/evidence/{evidenceId}/download-url` | Request a short-lived download URL |

> [!NOTE]
> The browser UI is still local-first by default. Set `VITE_API_BASE_URL` to the deployed API and complete the service and state integration before expecting existing UI actions to persist to AWS.

When the API changes, keep the frontend service layer, backend request validation, and response types aligned, and document authentication requirements, validation errors, pagination, and error responses once those contracts are final.

## <img src="assets/icons/database.svg" height="32" align="absmiddle" alt=""> Data model

```mermaid
erDiagram
    ORGANIZATION ||--o{ CLAIM : reports
    CLAIM ||--o{ STAGE_RECORD : "has"
    CLAIM ||--o{ EVIDENCE : "supported by"
    CLAIM ||--o{ DISCREPANCY : "may raise"
    DISCREPANCY ||--o{ REVIEW_NOTE : "investigated via"
    CLAIM ||--o{ ACTIVITY_EVENT : "logs"
    CLAIM ||--o{ NOTIFICATION : "triggers"

    ORGANIZATION { string name string type string location }
    CLAIM { string id string period string material string status }
    STAGE_RECORD { string stage number quantity string unit string source_ref }
    EVIDENCE { string reference string file_location string type string state }
    DISCREPANCY { string type number difference string tolerance string status }
    REVIEW_NOTE { string note string author string timestamp }
    ACTIVITY_EVENT { string event_type string actor string timestamp }
    NOTIFICATION { string message string scope boolean read }
```

<details>
<summary><b><img src="assets/icons/cube.svg" height="22" align="absmiddle" alt=""> &nbsp;Logical entities in detail</b></summary>

<br>

| Entity | Typical fields |
| --- | --- |
| **Claim** | identifier, organization, reporting period, material type, claimed quantities, status |
| **Organization or facility** | identifier, name, type, location, associated claims |
| **Material-stage record** | claim, lifecycle stage, quantity, unit, timestamp, source reference |
| **Evidence metadata** | document reference, file location, type, related claim or stage, uploader, availability state |
| **Discrepancy** | type, compared values, difference, configured tolerance, explanation, investigation status |
| **Review note** | related claim or discrepancy, note, author, timestamp |
| **Activity event** | event type, target record, description, actor, timestamp |
| **Notification** | recipient or scope, message, related record, timestamp, read state |

The actual DynamoDB table design may combine several logical entities into fewer tables. Consult the deployed schema and data-access code for partition keys, sort keys, indexes, and access patterns.

</details>

### <img src="assets/icons/scales.svg" height="26" align="absmiddle" alt=""> Reconciliation principles

| | Principle |
| :-: | --- |
| <img src="assets/icons/ruler.svg" height="28" align="absmiddle" alt=""> | Compare values only when **units and contexts** are compatible |
| <img src="assets/icons/eye.svg" height="28" align="absmiddle" alt=""> | Keep **source values visible** next to calculated differences |
| <img src="assets/icons/calc.svg" height="28" align="absmiddle" alt=""> | **Explain which rule** triggered a discrepancy |
| <img src="assets/icons/dashed.svg" height="28" align="absmiddle" alt=""> | Do not treat **missing data as zero** without an explicit, justified rule |
| <img src="assets/icons/percent.svg" height="28" align="absmiddle" alt=""> | Avoid percentages with a zero or missing denominator |
| <img src="assets/icons/sliders.svg" height="28" align="absmiddle" alt=""> | Make **tolerances explicit** and configurable where appropriate |
| <img src="assets/icons/bot.svg" height="28" align="absmiddle" alt=""> | Keep **automated flags separate** from human decisions |
| <img src="assets/icons/bookmark.svg" height="28" align="absmiddle" alt=""> | Preserve **source references** so findings trace back to the underlying records |

## <img src="assets/icons/cloud.svg" height="32" align="absmiddle" alt=""> AWS services

The infrastructure is defined in `backend/template.yaml` across **seven AWS services**.

| AWS service | Role in CycleProof |
| --- | --- |
| **Amazon API Gateway** | Exposes the HTTPS API to the frontend |
| **AWS Lambda** | Validates API requests, manages records, issues evidence URLs, and runs reconciliation logic |
| **Amazon DynamoDB** | Persists claims, organizations, evidence metadata, discrepancies, timeline events, notifications, and scheduled-finding markers |
| **Amazon S3** | Stores private, versioned, encrypted evidence files with public access blocked; the browser receives short-lived presigned URLs |
| **Amazon EventBridge** | Triggers the scheduled reconciliation Lambda daily at 02:00 UTC by default |
| **Amazon CloudWatch** | Collects Lambda JSON logs, metrics, and traces; alarms can be added as operational needs are defined |
| **Amazon SNS** | Publishes review alerts when scheduled reconciliation finds new discrepancy signals; subscriptions must be configured separately |

> [!WARNING]
> Deployment creates billable resources. Review the AWS pricing page and account budgets before deploying. The current starter does not include an identity provider, complete user authorization, email subscriptions, malware scanning, or a production audit guarantee.

## <img src="assets/icons/lock.svg" height="32" align="absmiddle" alt=""> Security and privacy

A full-stack deployment should apply controls appropriate to the sensitivity of the data.

<table>
<tr>
<td width="50%" valign="top">

### <img src="assets/icons/key.svg" height="26" align="absmiddle" alt=""> Access and data
- Use **least-privilege IAM roles** for Lambda and other AWS resources
- Keep evidence in a **private, versioned, encrypted** S3 bucket with public access blocked; hand the browser only short-lived presigned URLs
- Validate and authorize evidence upload and download operations
- Validate incoming API payloads and file metadata
- Apply authentication and authorization before exposing real organizational data
- Configure **CORS** to allow only intended frontend origins in production

</td>
<td width="50%" valign="top">

### <img src="assets/icons/shield.svg" height="26" align="absmiddle" alt=""> Hygiene and operations
- Keep secrets out of source control and frontend environment variables
- Use **HTTPS** for deployed traffic
- Limit uploaded file types and sizes, and consider malware scanning for untrusted files
- Avoid logging document contents, credentials, or unnecessary personal information
- Define retention, backup, and deletion policies for evidence and review records
- Monitor errors and resource usage, and review CloudWatch logs for unexpected behavior

</td>
</tr>
</table>

> [!WARNING]
> The precise controls available depend on the authentication, storage, and deployment configuration that is actually implemented. Do not describe the application as secure or compliant solely because it uses AWS.

## <img src="assets/icons/flask.svg" height="32" align="absmiddle" alt=""> Testing

<details open>
<summary><b><img src="assets/icons/play.svg" height="22" align="absmiddle" alt=""> &nbsp;Run the checks</b></summary>

<br>

Frontend, from the `frontend` directory:

```bash
npm install
npm run build
```

Backend, from the `backend` directory. For a Python project using pytest:

```bash
python -m pip install -r requirements.txt
python -m pytest
```

Adjust the dependency file or test command if the repository uses a different setup.

</details>

<details>
<summary><b><img src="assets/icons/target.svg" height="22" align="absmiddle" alt=""> &nbsp;Recommended test coverage</b></summary>

<br>

- [ ] Unit tests for quantity reconciliation and tolerance calculations
- [ ] Validation of missing values, incompatible units, and zero denominators
- [ ] CSV parsing, column mapping, malformed rows, and duplicate detection
- [ ] Backend request validation and error handling
- [ ] Data-access tests for claims, evidence metadata, and review status changes
- [ ] API integration tests for expected response schemas and status codes
- [ ] Authorization tests for evidence and organization-level data access
- [ ] Frontend workflows for search, filters, review actions, notifications, and reports
- [ ] End-to-end tests for a complete claim investigation
- [ ] Deployment smoke tests after infrastructure changes

</details>

> [!CAUTION]
> Use isolated test resources and synthetic data. Never run destructive tests against production records.

## <img src="assets/icons/wrench.svg" height="32" align="absmiddle" alt=""> Troubleshooting

<details>
<summary><b><img src="assets/icons/globe.svg" height="22" align="absmiddle" alt=""> &nbsp;Frontend cannot reach the API</b></summary>

<br>

- Confirm the API base URL is correct
- Verify the API is running or deployed
- Inspect the browser network panel and backend logs
- Check CORS configuration and request paths

</details>

<details>
<summary><b><img src="assets/icons/warning.svg" height="22" align="absmiddle" alt=""> &nbsp;API returns an error</b></summary>

<br>

- Inspect the HTTP status code and response body
- Check Lambda logs in CloudWatch for the relevant request
- Verify required environment variables and resource permissions
- Confirm the request matches the backend's validation schema

</details>

<details>
<summary><b><img src="assets/icons/lock.svg" height="22" align="absmiddle" alt=""> &nbsp;Lambda cannot access DynamoDB or S3</b></summary>

<br>

- Confirm the correct table or bucket name is configured
- Review the Lambda execution role and least-privilege policies
- Check the selected AWS Region and deployed stack outputs

</details>

<details>
<summary><b><img src="assets/icons/database.svg" height="22" align="absmiddle" alt=""> &nbsp;SAM build or local invocation fails</b></summary>

<br>

- Validate the template
- Confirm Python and dependency versions match the configured Lambda runtime
- Check Docker availability if the build configuration requires it
- Read SAM output for the first underlying error instead of relying only on the final failure message

</details>

<details>
<summary><b><img src="assets/icons/upload.svg" height="22" align="absmiddle" alt=""> &nbsp;Evidence upload fails</b></summary>

<br>

- Check file size and file type restrictions
- Confirm the upload flow and any presigned URL have not expired
- Verify S3 permissions, CORS rules, and content-type handling
- Avoid retrying destructive or duplicate operations without checking the resulting records

</details>

<details>
<summary><b><img src="assets/icons/bell.svg" height="22" align="absmiddle" alt=""> &nbsp;No review alerts arrive</b></summary>

<br>

- Add an email or other endpoint subscription to the SNS topic and confirm it
- Check that the scheduled reconciliation ran (daily at 02:00 UTC by default) in the Lambda's CloudWatch logs
- Alerts are published only when reconciliation finds new discrepancy signals

</details>

<details>
<summary><b><img src="assets/icons/save.svg" height="22" align="absmiddle" alt=""> &nbsp;UI changes don't persist to AWS</b></summary>

<br>

- The UI is local-first by default; set `VITE_API_BASE_URL` to the deployed API
- Complete the frontend service and state integration so UI actions call the API
- Mock records in the frontend are not automatically uploaded to DynamoDB

</details>

<img src="assets/divider.svg" alt="" width="100%">

## <img src="assets/icons/route.svg" height="32" align="absmiddle" alt=""> Roadmap

> [!NOTE]
> Update this section as milestones are completed. Planned work is not an existing capability.

- [ ] Complete the frontend service and state integration with the API
- [ ] Add an identity provider and complete user and tenant-level authorization
- [ ] Improve reconciliation rules with domain experts
- [ ] Expand integration and end-to-end test coverage
- [ ] Strengthen organization-level access controls and audit protections
- [ ] Improve large-file handling and evidence validation, including malware scanning
- [ ] Set up alert subscriptions and CloudWatch alarms
- [ ] Add clear export formats and reporting workflows
- [ ] Improve operational monitoring and cost visibility
- [ ] Evaluate usability with recycling operators and compliance reviewers
- [ ] Document data retention and governance practices

## <img src="assets/icons/users.svg" height="32" align="absmiddle" alt=""> Contributing

1. **Review** the current architecture and coding conventions before changing files.
2. **Keep frontend API types aligned** with backend request and response schemas.
3. **Add or update tests** when changing reconciliation logic or data contracts.
4. **Avoid committing** secrets, private data, build output, or local environment files.
5. **Run the relevant frontend and backend checks** before opening a pull request.
6. **Describe** changed behavior, testing performed, and any known limitations.

## <img src="assets/icons/scales.svg" height="32" align="absmiddle" alt=""> Disclaimer

CycleProof is a software tool intended to support the review of environmental claims. It is not, by itself, a regulatory certification system, legal determination, or substitute for an independent audit. A discrepancy indicates that information may need further investigation; it does not establish fraud, intent, or environmental impact. Conclusions should be based on reliable evidence and qualified human review.

<br>

<div align="center">

**CycleProof: follow the material, investigate the gaps, support transparent reporting.**

<sub>Built for **AWS Environmental Hacks by WeMakeDevs** <img src="assets/icons/cycle.svg" height="18" align="absmiddle" alt=""></sub>

<br><br>

<img src="assets/divider.svg" alt="" width="60%">

</div>