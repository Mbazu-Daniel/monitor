"use client";

import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgSlug/profile")({
  component: () => <Navigate to="/$orgSlug/settings" params={Route.useParams()} replace />,
});
