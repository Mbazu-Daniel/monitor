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

## API Documentation

All API routes are mounted under `/api/v1`. Authentication uses `better-auth` session cookies; include credentials on every request. Interactive Swagger docs are available at `/api/v1/docs` when the API is running.

#### GET /api/v1/health

**Description**: Health check endpoint.

**Request**: No body required.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

**Errors**:
- 500: Server error

#### ALL /api/v1/auth/*

**Description**: Authentication routes handled by better-auth, including sign-up, sign-in, sign-out, session, and organization-related flows.

**Request**: Depends on the specific auth route.

**Response**: Depends on the specific auth route.

**Errors**:
- 400: Invalid credentials or payload
- 401: Unauthorized

#### GET /api/v1/me

**Description**: Returns the current user's profile and campus membership.

**Request**: No body required.

**Response**:
```json
{
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@university.edu",
    "role": "ADMIN",
    "organizationId": "org-id",
    "organizationName": "Miva Open University",
    "organizationSlug": "miva-open-university",
    "organizationCode": "MOU",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Errors**:
- 401: Not authenticated

#### PATCH /api/v1/me

**Description**: Updates the current user's profile.

**Request**:
```json
{
  "name": "John Doe",
  "department": "Facilities",
  "phone": "+1234567890"
}
```

**Response**:
```json
{
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@university.edu",
    "role": "ADMIN"
  }
}
```

**Errors**:
- 400: Invalid payload
- 401: Not authenticated

#### GET /api/v1/organizations

**Description**: Lists all organizations the current user belongs to.

**Request**: No body required.

**Response**:
```json
{
  "organizations": [
    {
      "id": "org-id",
      "name": "Miva Open University",
      "slug": "miva-open-university",
      "code": "MOU",
      "role": "ADMIN"
    }
  ]
}
```

**Errors**:
- 401: Not authenticated

#### GET /api/v1/organizations/resolve

**Description**: Resolves a campus code to its organization details.

**Request**:
```json
{
  "code": "MOU"
}
```

**Response**:
```json
{
  "organization": {
    "name": "Miva Open University",
    "slug": "miva-open-university",
    "code": "MOU"
  }
}
```

**Errors**:
- 400: Code is required
- 404: Campus not found

#### POST /api/v1/organizations

**Description**: Creates a new campus organization.

**Request**:
```json
{
  "name": "Miva Open University",
  "slug": "miva-open-university",
  "code": "MOU",
  "department": "Engineering",
  "categories": [
    { "name": "Electrical", "description": "Electrical faults", "icon": "Zap" }
  ]
}
```

**Response**:
```json
{
  "id": "org-id",
  "name": "Miva Open University",
  "slug": "miva-open-university",
  "code": "MOU"
}
```

**Errors**:
- 400: Invalid payload
- 401: Not authenticated
- 409: That subdomain or campus code is already taken, or the account already belongs to the maximum number of campuses (10)

#### POST /api/v1/organizations/join

**Description**: Joins an existing campus using its code.

**Request**:
```json
{
  "campusCode": "MOU",
  "department": "Engineering",
  "phone": "+1234567890"
}
```

**Response**:
```json
{
  "organization": {
    "id": "org-id",
    "name": "Miva Open University",
    "slug": "miva-open-university",
    "code": "MOU"
  },
  "alreadyMember": false,
  "staffNo": "MOU/S0001"
}
```

**Errors**:
- 400: Invalid code
- 404: Campus not found

#### GET /api/v1/users

**Description**: Lists users in the current campus. Requires `user:manageStudents` permission.

**Request**: Query parameters: `search`, `role`, `page`, `pageSize`.

**Response**:
```json
{
  "items": [
    {
      "id": "user-id",
      "name": "Jane Doe",
      "email": "jane@university.edu",
      "role": "STUDENT",
      "department": "Computer Science",
      "matricNo": "MOU/S0001",
      "isActive": true
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

**Errors**:
- 403: Forbidden

#### POST /api/v1/users

**Description**: Creates a new user account. Requires `user:manageStudents` permission.

**Request**:
```json
{
  "name": "Jane Doe",
  "email": "jane@university.edu",
  "password": "SecurePass123",
  "role": "STUDENT",
  "department": "Computer Science"
}
```

**Response**:
```json
{
  "user": {
    "id": "user-id",
    "name": "Jane Doe",
    "email": "jane@university.edu",
    "role": "STUDENT",
    "matricNo": "MOU/S0001"
  }
}
```

**Errors**:
- 400: Invalid payload
- 403: Forbidden
- 409: User already exists

#### PATCH /api/v1/users/:id

**Description**: Updates a user account. Requires `user:manageStudents` permission.

**Request**:
```json
{
  "name": "Jane Doe",
  "department": "Engineering",
  "role": "STAFF",
  "isActive": true
}
```

**Response**:
```json
{
  "user": {
    "id": "user-id",
    "name": "Jane Doe",
    "email": "jane@university.edu",
    "role": "STAFF"
  }
}
```

**Errors**:
- 403: Forbidden
- 404: User not found
- 409: Cannot demote the only admin

#### GET /api/v1/categories

**Description**: Lists maintenance categories for the current campus.

**Request**: No body required.

**Response**:
```json
{
  "categories": [
    {
      "id": "category-id",
      "name": "Electrical",
      "description": "Electrical faults",
      "icon": "Zap"
    }
  ]
}
```

**Errors**:
- 401: Not authenticated

#### POST /api/v1/categories

**Description**: Creates a new maintenance category. Requires `category:manage` permission.

**Request**:
```json
{
  "name": "Plumbing",
  "description": "Plumbing issues",
  "icon": "Droplet"
}
```

**Response**:
```json
{
  "category": {
    "id": "category-id",
    "name": "Plumbing",
    "description": "Plumbing issues",
    "icon": "Droplet"
  }
}
```

**Errors**:
- 400: Invalid payload
- 403: Forbidden
- 409: Category already exists

#### PATCH /api/v1/categories/:id

**Description**: Updates a maintenance category. Requires `category:manage` permission.

**Request**:
```json
{
  "name": "Plumbing Issues",
  "description": "All plumbing related faults"
}
```

**Response**:
```json
{
  "category": {
    "id": "category-id",
    "name": "Plumbing Issues",
    "description": "All plumbing related faults"
  }
}
```

**Errors**:
- 403: Forbidden
- 404: Category not found

#### DELETE /api/v1/categories/:id

**Description**: Deletes a maintenance category. Requires `category:manage` permission.

**Request**: No body required.

**Response**:
```json
{
  "success": true
}
```

**Errors**:
- 403: Forbidden
- 404: Category not found
- 409: Category is in use

#### GET /api/v1/requests

**Description**: Lists service requests for the current user based on role and visibility.

**Request**: Query parameters: `search`, `status`, `priority`, `categoryId`, `sort`, `page`, `pageSize`.

**Response**:
```json
{
  "items": [
    {
      "id": "request-id",
      "reference": "SR-1",
      "title": "Broken AC in Lecture Hall",
      "description": "The AC is not cooling",
      "location": "Lecture Hall A",
      "priority": "HIGH",
      "status": "OPEN",
      "category": { "id": "category-id", "name": "Electrical" },
      "creator": { "id": "user-id", "name": "John Doe", "role": "STUDENT" }
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

**Errors**:
- 401: Not authenticated

#### POST /api/v1/requests

**Description**: Creates a new service request.

**Request**:
```json
{
  "title": "Broken AC in Lecture Hall",
  "description": "The AC is not cooling the room.",
  "location": "Lecture Hall A",
  "priority": "HIGH",
  "categoryId": "category-id"
}
```

**Response**:
```json
{
  "request": {
    "id": "request-id",
    "reference": "SR-1",
    "title": "Broken AC in Lecture Hall",
    "status": "OPEN"
  }
}
```

**Errors**:
- 400: Invalid payload
- 401: Not authenticated

#### GET /api/v1/requests/:id

**Description**: Gets detailed information about a single request.

**Request**: No body required.

**Response**:
```json
{
  "request": {
    "id": "request-id",
    "reference": "SR-1",
    "title": "Broken AC in Lecture Hall",
    "status": "OPEN",
    "comments": [],
    "attachments": [],
    "assignments": [],
    "statusLogs": []
  }
}
```

**Errors**:
- 403: You do not have permission to view this request
- 404: Request not found

#### PATCH /api/v1/requests/:id

**Description**: Updates a service request. Users can only edit their own open requests, while admins and officers have broader access.

**Request**:
```json
{
  "title": "Broken AC in Lecture Hall B",
  "priority": "URGENT"
}
```

**Response**:
```json
{
  "request": {
    "id": "request-id",
    "title": "Broken AC in Lecture Hall B",
    "priority": "URGENT"
  }
}
```

**Errors**:
- 400: Invalid payload
- 403: Not allowed to edit this request
- 404: Request not found

#### DELETE /api/v1/requests/:id

**Description**: Deletes a service request. Only the creator can delete while the request is still open.

**Request**: No body required.

**Response**:
```json
{
  "success": true
}
```

**Errors**:
- 403: Not allowed to delete this request
- 404: Request not found

#### POST /api/v1/requests/:id/status

**Description**: Changes the status of a request and logs the transition.

**Request**:
```json
{
  "status": "IN_PROGRESS",
  "note": "Technician is on the way"
}
```

**Response**:
```json
{
  "request": {
    "id": "request-id",
    "status": "IN_PROGRESS"
  }
}
```

**Errors**:
- 400: Invalid transition or payload
- 403: Not allowed to change status
- 404: Request not found

#### POST /api/v1/requests/:id/assign

**Description**: Assigns an officer to a request. Requires `request:assign` permission.

**Request**:
```json
{
  "officerId": "officer-user-id",
  "note": "Please handle this urgently"
}
```

**Response**:
```json
{
  "assignment": {
    "id": "assignment-id",
    "officer": { "id": "officer-user-id", "name": "Officer Name" },
    "assignedByUser": { "id": "admin-user-id", "name": "Admin Name" }
  },
  "status": "ASSIGNED"
}
```

**Errors**:
- 400: Request cannot be assigned or officer not available
- 403: Forbidden
- 404: Request or officer not found

#### DELETE /api/v1/requests/:id/assign

**Description**: Removes the current officer assignment and returns the request to the open queue. Requires `request:assign` permission.

**Request**: No body required.

**Response**:
```json
{
  "success": true
}
```

**Errors**:
- 400: No active assignment
- 403: Forbidden
- 404: Request not found

#### GET /api/v1/requests/:id/comments

**Description**: Lists comments on a request.

**Request**: No body required.

**Response**:
```json
{
  "comments": [
    {
      "id": "comment-id",
      "body": "Technician is on the way",
      "user": { "id": "user-id", "name": "John Doe", "role": "OFFICER" },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Errors**:
- 403: You do not have permission to view this request
- 404: Request not found

#### POST /api/v1/requests/:id/comments

**Description**: Adds a comment to a request.

**Request**:
```json
{
  "body": "Technician is on the way"
}
```

**Response**:
```json
{
  "comment": {
    "id": "comment-id",
    "body": "Technician is on the way",
    "user": { "id": "user-id", "name": "John Doe", "role": "OFFICER" }
  }
}
```

**Errors**:
- 400: Invalid payload
- 404: Request not found

#### GET /api/v1/notifications

**Description**: Lists the current user's notifications.

**Request**: Query parameters: `page`, `pageSize`.

**Response**:
```json
{
  "items": [
    {
      "id": "notification-id",
      "title": "Request SR-1 assigned",
      "message": "Your request has been assigned to Officer Name",
      "type": "STATUS",
      "isRead": false,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "unread": 1,
  "total": 1
}
```

**Errors**:
- 401: Not authenticated

#### POST /api/v1/notifications/:id/read

**Description**: Marks a single notification as read.

**Request**: No body required.

**Response**:
```json
{
  "success": true
}
```

**Errors**:
- 401: Not authenticated
- 404: Notification not found

#### POST /api/v1/notifications/read-all

**Description**: Marks all notifications as read.

**Request**: No body required.

**Response**:
```json
{
  "success": true
}
```

**Errors**:
- 401: Not authenticated

#### GET /api/v1/audit-logs

**Description**: Lists audit logs for the current campus. Requires `audit:read` permission.

**Request**: Query parameters: `search`, `action`, `page`, `pageSize`.

**Response**:
```json
{
  "items": [
    {
      "id": "log-id",
      "action": "REQUEST_CREATED",
      "entityType": "REQUEST",
      "entityId": "request-id",
      "details": "John Doe submitted SR-1",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "user": { "id": "user-id", "name": "John Doe", "role": "STUDENT" }
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

**Errors**:
- 403: Forbidden

#### GET /api/v1/stats/personal

**Description**: Returns personal statistics for the current user. Requires `stats:personal` permission.

**Request**: No body required.

**Response**:
```json
{
  "total": 5,
  "open": 2,
  "inProgress": 1,
  "resolved": 2,
  "recent": []
}
```

**Errors**:
- 403: Forbidden

#### GET /api/v1/stats/officer

**Description**: Returns work statistics for the current officer. Requires `stats:officer` permission.

**Request**: No body required.

**Response**:
```json
{
  "assignedTotal": 4,
  "newAssigned": 1,
  "inProgress": 2,
  "onHold": 0,
  "resolvedThisMonth": 1,
  "avgResolutionHours": 24.5,
  "recent": []
}
```

**Errors**:
- 403: Forbidden

#### GET /api/v1/stats/admin

**Description**: Returns admin dashboard statistics. Requires `stats:admin` permission.

**Request**: No body required.

**Response**:
```json
{
  "totalRequests": 10,
  "byStatus": { "OPEN": 3, "ASSIGNED": 2, "RESOLVED": 5 },
  "byPriority": { "URGENT": 1, "HIGH": 3, "MEDIUM": 6 },
  "unassigned": 3,
  "totalUsers": 20,
  "totalOfficers": 4,
  "resolvedThisMonth": 2,
  "avgResolutionHours": 18.2,
  "monthlyTrend": [],
  "recentActivity": []
}
```

**Errors**:
- 403: Forbidden

#### GET /api/v1/export/requests

**Description**: Exports service requests as a CSV file. Requires `report:export` permission.

**Request**: Query parameters: `status`, `priority`, `categoryId`.

**Response**: CSV file download.

**Errors**:
- 403: Forbidden

#### POST /api/v1/requests/:requestId/attachments/upload-url

**Description**: Generates a presigned URL for uploading an attachment.

**Request**:
```json
{
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 102400
}
```

**Response**:
```json
{
  "attachmentId": "attachment-id",
  "uploadUrl": "https://presigned-url",
  "key": "requests/request-id/attachments/uuid-photo.jpg",
  "expiresAt": "2025-01-01T00:15:00.000Z",
  "maxBytes": 5242880,
  "allowedMimeTypes": ["image/jpeg", "image/png"]
}
```

**Errors**:
- 400: Invalid payload or not in a campus
- 403: Not allowed to attach to this request

#### POST /api/v1/requests/:requestId/attachments/:attachmentId/confirm

**Description**: Confirms an uploaded attachment and verifies it against object storage metadata.

**Request**: No body required.

**Response**:
```json
{
  "id": "attachment-id",
  "fileName": "photo.jpg",
  "status": "READY",
  "fileUrl": "https://presigned-download-url"
}
```

**Errors**:
- 400: Upload missing or invalid metadata
- 404: Attachment not found

#### DELETE /api/v1/requests/:requestId/attachments/:attachmentId

**Description**: Deletes an attachment and its stored object.

**Request**: No body required.

**Response**:
```json
{
  "deleted": true
}
```

**Errors**:
- 403: Not allowed to delete this attachment
- 404: Attachment not found

#### GET /api/v1/realtime/stream

**Description**: Server-Sent Events stream for real-time request updates in the current campus.

**Request**: No body required.

**Response**: Stream of `text/event-stream` messages.

**Errors**:
- 401: Not authenticated

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
| `PORT` | API port | `8089` |
| `TRUST_PROXY` | Trust proxy headers | `true` |
| `LOG_LEVEL` | Logging level | `info` |

Object storage is optional. If `R2_*` variables are not set, attachment uploads are disabled and the rest of the app still works.

## Operations

**Health endpoints.** `GET /api/v1/health` is a shallow liveness check (process is up). `GET /api/v1/health/ready` performs `SELECT 1` against the database with a 1.5s bound and returns `503` when the database is unreachable — use it for routing/rollback decisions, keep `/health` for liveness probes.

**Notifications are durable.** Announcing to users (assignment, status change, comment) writes a `notification_outbox` row inside the same transaction as the business change. A background sweeper in the API claims rows every 10 seconds with `FOR UPDATE SKIP LOCKED`, resolves recipients, writes `notification` rows, and marks them published. Crashes between "business commit" and "notification sent" are no longer possible; failed deliveries retry for 10 attempts before being dropped as `[METRIC] notify_dlq`. Watch the following log lines in your drain; they are the alerting surface: `[METRIC] audit_write_failed`, `[METRIC] audit_dropped_missing_org`, `[METRIC] notify_outbox_insert_failed`, `[METRIC] notify_retry`, `[METRIC] notify_dlq`, `[METRIC] notification_sweep_failed`, `[METRIC] idempotency_store_failed`, `[PG_POOL_ERROR]`, `[REALTIME_PG_ERROR]`, `[REALTIME_CONNECT_FAILED]`, `[REALTIME_NOTIFY_FAILED]`.

**Idempotency.** State-changing endpoints honor an `Idempotency-Key` header (any unique string, kept 24h): replaying the same key with the same body returns the stored response with an `Idempotent-Replay: true` header instead of re-executing — including creating duplicate requests. Sending the same key with a different body returns `409`. If absent, requests are processed normally (nothing breaks, but nothing is deduped either).

**Migrations.** The API runs `prisma migrate deploy` at container start (before the server listens). Deploys of multiple replicas serialize on the migration advisory lock; a failed migration fails fast and the container does not start. Keep migrations forward-only and follow expand → migrate → contract for anything destructive.

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

