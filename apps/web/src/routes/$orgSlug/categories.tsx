"use client";

import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/components/layout/require-role";
import { CategoriesView } from "@/components/admin/admin-categories";

export const Route = createFileRoute("/$orgSlug/categories")({
  component: () => (
    <RequireRole roles={["ADMIN"]}>
      <CategoriesView />
    </RequireRole>
  ),
});
