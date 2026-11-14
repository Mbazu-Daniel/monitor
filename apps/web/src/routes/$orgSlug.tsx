import { createFileRoute } from "@tanstack/react-router";
import { OrgGate } from "@/components/layout/org-gate";

export const Route = createFileRoute("/$orgSlug")({
  component: OrgSlugRoute,
});

function OrgSlugRoute() {
  const { orgSlug } = Route.useParams();
  return <OrgGate orgSlug={orgSlug} />;
}
