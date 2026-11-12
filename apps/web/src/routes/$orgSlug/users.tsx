"use client";

import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/components/layout/require-role";
import { UsersView } from "@/components/admin/admin-users";

export const Route = createFileRoute("/$orgSlug/users")({
  component: () => (
    <RequireRole roles={["ADMIN"]}>
      <UsersView />
    </RequireRole>
  ),
});
