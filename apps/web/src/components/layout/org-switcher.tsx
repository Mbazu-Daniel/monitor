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
import { ApiError } from "@/lib/client";
import { toast } from "sonner";
import { OrgSummary, switchOrganization } from "@/lib/organizations";
import { useAppStore } from "@/stores/app-store";

function OrgAvatar({ name }: { name?: string }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-night text-[11px] font-bold text-night-foreground">
      {(name ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}

function OrgItem({ org, checked, onSwitch }: { org: OrgSummary; checked: boolean; onSwitch: (org: OrgSummary) => void }) {
  return (
    <DropdownMenuItem onClick={() => onSwitch(org)} className="gap-2">
      <OrgAvatar name={org.name} />
      <span className="min-w-0 flex-1 truncate">{org.name}</span>
      {checked && <Check className="h-4 w-4 text-foreground" />}
    </DropdownMenuItem>
  );
}

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
      const user = await switchOrganization(org.id, setUser);
      refetch();
      if (user.organizationSlug) {
        tNavigate({ to: "/$orgSlug", params: { orgSlug: user.organizationSlug }, replace: true });
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not switch campus");
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
          <OrgAvatar name={current?.name ?? user?.organizationName} />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
            {current?.name ?? user?.organizationName ?? "Select campus"}
          </span>
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your campuses</DropdownMenuLabel>
        {organizations.map((org) => (
          <OrgItem key={org.id} org={org} checked={org.id === current?.id} onSwitch={switchOrg} />
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
