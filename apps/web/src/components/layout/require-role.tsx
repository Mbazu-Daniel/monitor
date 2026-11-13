import { useParams, Navigate } from "@tanstack/react-router";
import { useAppStore } from "@/stores/app-store";
import type { UserRole } from "@/types";

export function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const orgSlug = useParams({ from: "/$orgSlug", select: (p) => p.orgSlug });
  if (!user) return <Navigate to="/" replace />;
  if (!user.role || !roles.includes(user.role)) return <Navigate to="/$orgSlug" params={{ orgSlug }} replace />;
  return <>{children}</>;
}
