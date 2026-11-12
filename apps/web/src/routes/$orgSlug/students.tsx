"use client";

import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/components/layout/require-role";
import { StudentsView } from "@/components/admin/students-view";

export const Route = createFileRoute("/$orgSlug/students")({
  component: () => (
    <RequireRole roles={["STAFF", "ADMIN"]}>
      <StudentsView />
    </RequireRole>
  ),
});
