-- Hardening for concurrency and durability. lock_timeout fails fast instead of
-- queueing behind a long transaction and blocking all traffic.
SET lock_timeout = '5s';

-- ── Idempotency keys (one row per (scope, key); first writer wins) ──────────
CREATE TABLE "idempotency_key" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "statusCode" INTEGER,
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_key_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idempotency_key_scope_key_key" ON "idempotency_key"("scope", "key");
CREATE INDEX "idempotency_key_createdAt_idx" ON "idempotency_key"("createdAt");

-- ── Durable notification outbox (drained by the API; SKIP LOCKED claiming) ──
CREATE TABLE "notification_outbox" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "requestId" TEXT,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notification_outbox_publishedAt_createdAt_idx" ON "notification_outbox"("publishedAt", "createdAt");

-- ── One active assignment per request, guaranteed by the database ───────────
-- Release duplicate active assignments, keeping the most recently created.
UPDATE "assignment" a
SET "isActive" = false, "releasedAt" = now()
WHERE a."isActive" = true
  AND EXISTS (
      SELECT 1 FROM "assignment" b
      WHERE b."requestId" = a."requestId"
        AND b."isActive" = true
        AND b."createdAt" > a."createdAt"
  );
CREATE UNIQUE INDEX "assignment_one_active_per_request" ON "assignment"("requestId") WHERE "isActive" = true;

-- ── Listing/ordering indexes for hot paths ──────────────────────────────────
CREATE INDEX "notification_memberId_createdAt_idx" ON "notification"("memberId", "createdAt");
CREATE INDEX "status_log_requestId_toStatus_idx" ON "status_log"("requestId", "toStatus");
CREATE INDEX IF NOT EXISTS "service_request_organizationId_status_idx" ON "service_request"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "service_request_organizationId_createdAt_idx" ON "service_request"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "service_request_organizationId_creatorId_idx" ON "service_request"("organizationId", "creatorId");

-- ── Global (org-less) categories must not duplicate ─────────────────────────
-- Postgres treats NULLs as distinct in unique indexes, so the existing
-- @@unique([organizationId, name]) lets (NULL, 'Plumbing') rows repeat.
CREATE UNIQUE INDEX "category_global_name_key" ON "category"("name") WHERE "organizationId" IS NULL;

-- ── Staff/student numbers must be unique ────────────────────────────────────
CREATE UNIQUE INDEX "user_matricNo_key" ON "user"("matricNo");
