import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "../generated/prisma/client.ts";

export async function generateReference(tx: Pick<PrismaClient, "organization">, organizationId: string): Promise<string> {
  const org = await tx.organization.update({
    where: { id: organizationId },
    data: { nextRequestSeq: { increment: 1 } },
    select: { nextRequestSeq: true },
  });
  return `SR-${org.nextRequestSeq - 1}`;
}

export const statusLabel = (s: string) => {
  const words = s.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export function statusAnnouncement(reference: string, from: string, to: string, note?: string) {
  const title = `Request ${reference} is now ${statusLabel(to)}`;
  const message = `Status changed from ${statusLabel(from)} to ${statusLabel(to)}.${note ? ` Note: ${note}` : ""}`;
  const type: "SUCCESS" | "WARNING" | "STATUS" = to === "RESOLVED" || to === "CLOSED" ? "SUCCESS" : to === "REJECTED" ? "WARNING" : "STATUS";
  return { title, message, type };
}

export async function memberUserId(db: Pick<PrismaClient, "member">, memberId: string | null | undefined): Promise<string | null> {
  if (!memberId) return null;
  const member = await db.member.findUnique({ where: { id: memberId }, select: { userId: true } });
  return member?.userId ?? null;
}

export async function assertCategoryInCampus(
  db: Pick<PrismaClient, "category">,
  categoryId: string,
  organizationId: string,
  missing: "BadRequest" | "NotFound",
) {
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw missing === "BadRequest"
      ? new BadRequestException("The selected category no longer exists.")
      : new NotFoundException("That category no longer exists.");
  }
  if (category.organizationId && category.organizationId !== organizationId) {
    throw new BadRequestException("That category isn't available for your campus.");
  }
  return category;
}
