"use client";

import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/components/layout/require-role";
import { AuditLogView } from "@/components/admin/audit-log";

export const Route = createFileRoute("/$orgSlug/audit")({
  component: () => (
    <RequireRole roles={["ADMIN"]}>
      <AuditLogView />
    </RequireRole>
  ),
});
