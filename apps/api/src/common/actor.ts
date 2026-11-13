import type { Prisma } from "../generated/prisma/client.ts";

export const creatorSelect = { select: { id: true, name: true, email: true, department: true, matricNo: true } } as const;
export const officerSelect = { select: { id: true, name: true, email: true, phone: true, department: true } } as const;
export const assignedBySelect = { select: { id: true, name: true } } as const;

export const creatorActor = { select: { role: true, user: creatorSelect } } as const;
export const officerActor = { select: { role: true, user: officerSelect } } as const;
export const assignedByActor = { select: { role: true, user: assignedBySelect } } as const;

export const logAuthorInclude = { select: { role: true, user: { select: { id: true, name: true } } } } as const;

export const requestIncludeForList = {
  category: true,
  creator: creatorActor,
  attachments: { where: { status: "READY" }, select: { id: true, fileName: true, mimeType: true, sizeBytes: true } },
  _count: { select: { comments: true } },
} satisfies Prisma.ServiceRequestInclude;

export function toActor<U extends object>(
  member: { role: string; user: U } | null | undefined,
): (U & { role: string }) | null {
  if (!member) return null;
  return { ...member.user, role: member.role };
}

export function toLogActor(row: {
  member: { role: string; user: { id: string; name: string } } | null;
  user: { id: string; name: string } | null;
}): { id: string; name: string; role: string | null } | null {
  const { member, user } = row;
  if (member) return { id: member.user.id, name: member.user.name, role: member.role };
  if (user) return { id: user.id, name: user.name, role: null };
  return null;
}
