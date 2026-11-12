# MivaCampus

University maintenance requests, submitted once and tracked to a fix. Students and staff report faults (electricity, plumbing, internet, equipment, hostel works), maintenance officers pick up assigned jobs on a work board, and admins manage accounts, categories, reports and an audit trail.

## Stack

- **Web**: React 19, TanStack Start (file-based routes), Vite, Tailwind 4 — `apps/web`
- **API**: NestJS 12, Prisma 7, PostgreSQL 18 (Docker), better-auth sessions — `apps/api`
- **Contracts**: shared Zod DTOs, policy and workflow — `packages/contracts`
- **Package manager**: pnpm workspaces + Turborepo

## Requirements

- Node.js >= 24
- pnpm 12
- Docker (for PostgreSQL)

## Setup

```bash
pnpm install

# start Postgres on :54443 (see docker-compose.yml)
docker compose up -d postgres

# apply the schema and seed the demo campus (miva-open-university)
cd apps/api && pnpm db:push && pnpm db:seed && cd ../..

# run web and API together
pnpm dev
```

- Web: http://localhost:5173 (proxies `/api/*` to the API; override with `API_PROXY_TARGET`)
- API: http://localhost:8089/api/v1 — health at `/api/v1/health`, Swagger at `/api/v1/docs`

Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL` (and `BETTER_AUTH_SECRET`) first. The API needs `R2_*` only for evidence photo uploads; without them uploads are disabled and the rest works.

## Demo accounts (seed)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@university.edu` | `Admin@123` |
| Staff | `staff@university.edu` | `Staff@123` |
| Officer | `officer1@university.edu` | `Officer@123` |

## Checks

```bash
pnpm typecheck   # both apps + contracts
pnpm test        # vitest: web components, contracts policies, api lifecycle/guards
pnpm lint        # oxlint
pnpm smoke       # curl-based end-to-end checks against a running instance (see scripts/smoke.sh)
```

## Layout

```
apps/web         TanStack Start web app
apps/api         NestJS API (REST under /api/v1)
packages/contracts  shared DTOs, RBAC policy, request lifecycle state machine
scripts/smoke.sh end-to-end smoke suite
docker-compose.yml Postgres 18 for local development
```

API reference is served at `/api/v1/docs` (Swagger) when the API is running.
