# MivaCampus

MivaCampus turns university maintenance chaos into a clean, trackable workflow. It gives students and staff a single place to report faults, and it gives maintenance teams the tools to assign, update, and resolve those requests without losing anything in email threads or spreadsheets.

## System Architecture

```mermaid
flowchart LR
  WebClient["Web Client (React + TanStack Start)"]
  APIServer["NestJS API"]
  PostgreSQL[("PostgreSQL")]
  ObjectStorage["Object Storage (R2/S3)"]
  Email["Email (Resend)"]

  WebClient -- "HTTPS / Server-Sent Events" --> APIServer
  APIServer --> PostgreSQL
  APIServer --> ObjectStorage
  APIServer --> Email

  style WebClient fill:#1e1b4b,stroke:#6366f1,stroke-width:2px,color:#fff
  style APIServer fill:#2e1065,stroke:#8b5cf6,stroke-width:2px,color:#fff
  style PostgreSQL fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#fff
  style ObjectStorage fill:#451a03,stroke:#f59e0b,stroke-width:2px,color:#fff
  style Email fill:#022c22,stroke:#10b981,stroke-width:2px,color:#fff
```

The web client talks to a single NestJS API over HTTPS. The API persists data in PostgreSQL, stores evidence photos in an compatible object storage bucket, and sends email notifications through Resend. Real-time updates flow back to the browser through a Server-Sent Events stream.

## Features

- **Role-based access control**: Four roles, STUDENT, STAFF, OFFICER, and ADMIN, each with fine-grained permissions for requests, users, categories, reports, and audit logs.
- **Full request lifecycle**: Create, assign, update, change status, comment, and close maintenance requests with automatic reference numbers and audit trails.
- **Real-time updates**: Server-Sent Events broadcast request changes to connected clients the moment they happen.
- **Evidence attachments**: Presigned upload and download URLs let users attach photos to requests without exposing object storage credentials.
- **Notifications**: In-app and email notifications keep reporters, officers, and admins informed about assignments and status changes.
- **Reporting and exports**: Role-specific stats dashboards plus CSV export of request data.
- **Audit logging**: Every significant action is recorded and searchable by admins.

### Request Lifecycle

```mermaid
sequenceDiagram
  actor Reporter
  participant API
  participant DB as Database
  participant Notifier as Notifications
  participant RT as Realtime

  Reporter->>API: Submit maintenance request
  API->>DB: Save request + generate reference
  API->>Notifier: Notify campus admins
  API->>RT: Broadcast new request event
  API->>Reporter: Return request details

  actor Admin
  Admin->>API: Assign officer to request
  API->>DB: Create assignment + status log
  API->>Notifier: Notify officer and reporter
  API->>RT: Broadcast assignment event
  API->>Admin: Return assignment details
```

### Status Update and Notification Flow

```mermaid
sequenceDiagram
  actor Officer
  participant API
  participant DB as Database
  participant Notifier as Notifications

  Officer->>API: Update request status
  API->>DB: Update status + log transition
  API->>Notifier: Notify creator and assigned officer
  API->>Officer: Return updated request
```

## Technologies Used

| Layer | Technology |
| --- | --- |
| Web client | React 19, TanStack Start, Vite, Tailwind 4 |
| API | NestJS 12, better-auth |
| ORM / Database | Prisma 7, PostgreSQL 18 |
| Object storage | S3-compatible (Cloudflare R2) |
| Email | Resend |
| Monorepo tooling | pnpm workspaces, Turborepo |
| Linting | oxlint |

## Installation

1. Clone the repository:

```bash
git clone https://github.com/Mbazu-Daniel/monitor.git
cd monitor
```

2. Install dependencies:

```bash
pnpm install
```

3. Start PostgreSQL locally:

```bash
docker compose up -d postgres
```

4. Copy and fill in the API environment variables:

```bash
cp apps/api/.env.example apps/api/.env
```

5. Run database migrations and seed a demo campus:

```bash
cd apps/api
pnpm db:migrate:deploy
pnpm db:seed
cd ../..
```

6. Start both the web app and API:

```bash
pnpm dev
```

The web app runs at `http://localhost:5173` (or the next free port, e.g. `5174`) and the API at `http://localhost:8089/api/v1`. If the web dev server comes up on a port other than `WEB_URL`, add that origin to `WEB_ORIGIN` (comma-separated) — better-auth rejects sign-in/sign-up from untrusted origins with `403 Forbidden`. Example: `WEB_ORIGIN=http://localhost:5174,http://localhost:4173,http://localhost:8089`.

## Usage

After seeding, you can sign in with any of these demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@university.edu` | `Admin@123` |
| Staff | `staff@university.edu` | `Staff@123` |
| Officer | `officer1@university.edu` | `Officer@123` |

Students and staff create requests from their dashboard. Admins manage users and categories and can assign open requests to officers. Officers update status and leave comments until the job is resolved or closed.
 

## Environment Variables

Copy `apps/api/.env.example` to `apps/api/.env` and configure the following:

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:54443/mivacampus` |
| `BETTER_AUTH_SECRET` | Secret for session signing | `random-secret-string` |
| `WEB_URL` | Web origin for CORS and auth emails | `https://miva.oktopals.com` |
| `WEB_ORIGIN` | Extra trusted origins (CORS + better-auth origin check), comma-separated | `http://localhost:5174,http://localhost:8089` |
| `RESEND_API_KEY` | Resend API key for email | `re_...` |
| `EMAIL_FROM` | Sender email address | `noreply@miva.oktopals.com` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID | `your-account-id` |
| `R2_ACCESS_KEY_ID` | R2 access key | `...` |
| `R2_SECRET_ACCESS_KEY` | R2 secret key | `...` |
| `R2_BUCKET_NAME` | R2 bucket name | `mivacampus-uploads` |
| `SOONWHY_API_KEY` | Soonwhy monitoring key | `...` |
| `SWAGGER_ENABLED` | Set to `true` to expose `/api/v1/docs` in production (always on elsewhere) | `false` |
| `SEED_DEMO_USERS` | Set to `true` to seed the demo campus on container start when absent (see below) | `false` |
| `PORT` | API port | `8089` |
| `TRUST_PROXY` | Trust proxy headers | `true` |
| `LOG_LEVEL` | Logging level | `info` |

Object storage is optional. If `R2_*` variables are not set, attachment uploads are disabled and the rest of the app still works.

## Operations

**Health endpoints.** `GET /api/v1/health` is a shallow liveness check (process is up). `GET /api/v1/health/ready` performs `SELECT 1` against the database with a 1.5s bound and returns `503` when the database is unreachable — use it for routing/rollback decisions, keep `/health` for liveness probes.

**Notifications are durable.** Announcing to users (assignment, status change, comment) writes a `notification_outbox` row inside the same transaction as the business change. A background sweeper in the API claims rows every 10 seconds with `FOR UPDATE SKIP LOCKED`, resolves recipients, writes `notification` rows, and marks them published. Crashes between "business commit" and "notification sent" are no longer possible; failed deliveries retry for 10 attempts before being dropped as `[METRIC] notify_dlq`. Watch the following log lines in your drain; they are the alerting surface: `[METRIC] audit_write_failed`, `[METRIC] audit_dropped_missing_org`, `[METRIC] notify_outbox_insert_failed`, `[METRIC] notify_retry`, `[METRIC] notify_dlq`, `[METRIC] notification_sweep_failed`, `[METRIC] idempotency_store_failed`, `[PG_POOL_ERROR]`, `[REALTIME_PG_ERROR]`, `[REALTIME_CONNECT_FAILED]`, `[REALTIME_NOTIFY_FAILED]`.

**Idempotency.** State-changing endpoints honor an `Idempotency-Key` header (any unique string, kept 24h): replaying the same key with the same body returns the stored response with an `Idempotent-Replay: true` header instead of re-executing — including creating duplicate requests. Sending the same key with a different body returns `409`. If absent, requests are processed normally (nothing breaks, but nothing is deduped either).

**Migrations.** The API runs `prisma migrate deploy` at container start (before the server listens). Deploys of multiple replicas serialize on the migration advisory lock; a failed migration fails fast and the container does not start. Keep migrations forward-only and follow expand → migrate → contract for anything destructive.

**Demo data on boot.** When `SEED_DEMO_USERS=true`, the container seeds the demo campus (the 8 demo accounts, the "MIVA Open University" organization with memberships, categories, sample requests and notifications) right after migrations. The seed is guarded and idempotent: it takes a PostgreSQL advisory lock, checks for any existing demo accounts or the campus org slug, and skips entirely when they are present — re-deploys never duplicate or overwrite data, and a fresh database is seeded exactly once, in a single transaction. When the accounts already exist you will see `Demo data already present (matched demo emails or campus org) — skipping demo seed.` in the boot logs. A failed seed does not block the app from starting; fix the cause and redeploy (the seed retries on the next boot) or run `pnpm --filter @mivacampus/server db:seed:demo` manually against the affected database. Because the demo passwords are committed to this repository, enable `SEED_DEMO_USERS` only on demo/staging environments, not on installations holding real data.

**Connection pool.** The API uses a `pg.Pool` with `max: 10`, `connectionTimeoutMillis: 3s`, `idleTimeoutMillis: 30s`, `statement_timeout: 15s`, and logging on the pool `error` event — idle-connection errors no longer crash the process. Budget `instances × 10` connections against your `max_connections`.

**Realtime.** Server-Sent Events are broadcast across replicas using PostgreSQL `LISTEN/NOTIFY` on the `campus_events` channel (no external broker needed). Each replica re-publishes events it receives. The stream sends a `ping` heartbeat every 25s so proxies don't idle-timeout the connection.

**Rate limiting.** The built-in throttler is in-memory per instance (300 req/min/IP, 30/min for attachment upload URLs) — with N replicas the effective limit is N× per instance. Front the service with an edge limiter (Railway/Cloudflare) or pin to one replica if strict limits matter.

**Exports.** `GET /api/v1/export/requests` streams at most 10,000 rows and sets `X-Export-Truncated: true` when the limit is hit; CSV cells starting with `=`, `+`, `-`, `@` or tab are prefixed with `'` to neutralize spreadsheet formula injection.

**Concurrency guarantees.** Request status transitions use a conditional `UPDATE … WHERE status = <from>` and return `409` when the request changed under you. Active assignments are guarded by a partial unique index (`assignment_one_active_per_request`, one active assignment per request) plus a row lock inside the transaction. Staff/student numbers (`matricNo`) are unique, as are global category names.

**Swagger.** `/api/v1/docs` is served outside production; in production it is only served when `SWAGGER_ENABLED=true`.

## Contributing

Contributions are welcome. If you want to add a feature or fix a bug, open an issue first so we can agree on the approach. Follow the existing code style, run `pnpm lint` and `pnpm typecheck` before pushing, and make sure `pnpm test` passes.

## Author

- **Mbazu Ifeanyichukwu Daniel**
- Matric number: 2025/B/MIT/1364
- School ID: 301866442
- Course: MIT 8333 - Advanced Web Application Development

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

