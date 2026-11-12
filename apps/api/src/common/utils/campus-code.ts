import { prisma } from "./prisma.ts";
import { campusCodeFromName } from "@mivacampus/contracts";

export async function uniqueCampusCode(name: string): Promise<string> {
  const base = campusCodeFromName(name, "CAMPUS");
  for (let i = 0; i < 100; i++) {
    const suffix = i === 0 ? "" : String(i + 1);
    const root = base.slice(0, 10 - suffix.length);
    const candidate = `${root}${suffix}`;
    const found = await prisma.organization.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!found) return candidate;
  }
  return `${base.slice(0, 6)}${Date.now().toString(36).toUpperCase().slice(-4)}`.slice(0, 10);
}
