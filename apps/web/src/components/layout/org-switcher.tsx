"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDownIcon as ChevronDown, PlusCircle, CheckIcon as Check, Loader2 } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFetch } from "@/hooks/use-fetch";
import { api, ApiError } from "@/lib/client";
import { useAppStore } from "@/stores/app-store";

import type { SessionUser } from "@/types";

type OrgSummary = { id: string; name: string; slug: string; role: string };

export function OrgSwitcher() {
  const { user, setUser } = useAppStore();
  const tNavigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const { data, refetch } = useFetch<{ organizations: OrgSummary[] }>("/api/organizations");
  const organizations = data?.organizations ?? [];
  const current = organizations.find((org) => org.id === user?.organizationId) ?? organizations[0] ?? null;

  async function switchOrg(org: OrgSummary) {
    if (org.id === user?.organizationId) return;
    setBusy(org.id);
    try {
      await api("/api/auth/organization/set-active", { method: "POST", body: JSON.stringify({ organizationId: org.id }) });
      const me = await api<{ user: SessionUser }>("/api/me");
      setUser(me.user);
      refetch();
      if (me.user.organizationCode) {
        tNavigate({ to: "/$orgSlug", params: { orgSlug: me.user.organizationCode }, replace: true });
      }
    } catch (err) {
      console.error(err instanceof ApiError ? err.message : err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch campus"
          className="flex h-11 w-full items-center gap-2 rounded-full border border-border bg-secondary px-2.5 transition-colors hover:bg-sand-deep"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-night text-[11px] font-bold text-night-foreground">
            {(current?.name ?? user?.organizationName ?? "?").charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
            {current?.name ?? user?.organizationName ?? "Select campus"}
          </span>
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your campuses</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} onClick={() => switchOrg(org)} className="gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-night text-[11px] font-bold text-night-foreground">
              {org.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate">{org.name}</span>
            {org.id === current?.id && <Check className="h-4 w-4 text-foreground" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => tNavigate({ to: "/onboarding" })} className="gap-2 text-muted-foreground">
          <PlusCircle className="h-4 w-4" />
          Create campus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
