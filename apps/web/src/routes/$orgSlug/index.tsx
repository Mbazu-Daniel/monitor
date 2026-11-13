import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "@/components/dashboard/dashboards";

export const Route = createFileRoute("/$orgSlug/")({
  component: DashboardView,
});
