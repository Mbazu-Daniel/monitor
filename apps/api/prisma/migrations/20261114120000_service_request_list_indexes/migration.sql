-- Composite indexes for the hot list/stats queries on service_request:
-- tenant-scoped filters combined with status, recency ordering, and the
-- student/staff "own requests" visibility clause.
CREATE INDEX IF NOT EXISTS "service_request_organizationId_status_idx" ON "service_request"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "service_request_organizationId_createdAt_idx" ON "service_request"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "service_request_organizationId_creatorId_idx" ON "service_request"("organizationId", "creatorId");
