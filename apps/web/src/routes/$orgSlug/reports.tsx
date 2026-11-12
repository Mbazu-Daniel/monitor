"use client";

import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/components/layout/require-role";
import { ReportsView } from "@/components/admin/admin-reports";

export const Route = createFileRoute("/$orgSlug/reports")({
  component: () => (
    <RequireRole roles={["ADMIN"]}>
      <ReportsView />
    </RequireRole>
  ),
});
