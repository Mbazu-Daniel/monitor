"use client";

import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/components/settings/settings-view";

export const Route = createFileRoute("/$orgSlug/settings")({
  component: SettingsView,
});
