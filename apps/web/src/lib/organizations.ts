import { api } from "@/lib/client";
import type { SessionUser } from "@/types";

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export async function switchOrganization(organizationId: string, setUser: (u: SessionUser | null) => void) {
  await api("/api/auth/organization/set-active", { method: "POST", body: JSON.stringify({ organizationId }) });
  const me = await api<{ user: SessionUser }>("/api/me");
  setUser(me.user);
  return me.user;
}
