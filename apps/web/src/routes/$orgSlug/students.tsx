import { createFileRoute } from "@tanstack/react-router";
import { RequireRole } from "@/components/layout/require-role";
import { UserManagement } from "@/components/admin/user-management";

export const Route = createFileRoute("/$orgSlug/students")({
  component: () => (
    <RequireRole roles={["STAFF", "ADMIN"]}>
      <UserManagement scope="students" />
    </RequireRole>
  ),
});
