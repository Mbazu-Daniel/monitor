import { auth } from "../config/better-auth.config.ts";
import type { PrismaClient } from "../../generated/prisma/client.ts";
import type { AuthedRequest, SessionUser } from "./session.types.ts";

export async function readSession(req: { headers: { cookie?: string } }): Promise<SessionUser | null> {
  const headers = new Headers();
  if (req.headers.cookie) headers.set("cookie", req.headers.cookie);
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    activeOrganizationId: (session.session as { activeOrganizationId?: string | null } | undefined)?.activeOrganizationId ?? null,
  };
}

export async function lookupTenant(req: AuthedRequest, db: PrismaClient) {
  const session = await readSession(req);
  if (!session) return null;
  const dbUser = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      memberships: { select: { id: true, organizationId: true, role: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!dbUser || dbUser.isActive === false) return null;
  const memberships = dbUser.memberships;
  const preferred = session.activeOrganizationId
    ? memberships.find((m) => m.organizationId === session.activeOrganizationId)
    : undefined;
  const membership = preferred ?? memberships[0] ?? null;
  return { ...dbUser, membership, activeOrganizationId: session.activeOrganizationId };
}
