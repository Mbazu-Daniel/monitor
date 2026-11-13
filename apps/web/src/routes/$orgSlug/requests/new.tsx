import { createFileRoute } from "@tanstack/react-router";
import { RequestFormView } from "@/components/requests/request-form";

export const Route = createFileRoute("/$orgSlug/requests/new")({
  component: RequestFormView,
});
