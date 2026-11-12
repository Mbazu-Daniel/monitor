import { createFileRoute } from "@tanstack/react-router";
import { AcceptInvitationPage } from "@/pages/accept-invitation-page";

export const Route = createFileRoute("/accept-invitation")({
  validateSearch: (search: Record<string, unknown>): { id?: string } => {
    const id = typeof search.id === "string" && search.id.length > 0 ? search.id : undefined;
    return { id };
  },
  component: AcceptInvitationPage,
});
