import { prisma } from "./prisma.ts";

export function campusCodeFromName(name: string): string {
  const words = name.trim().split(/[^A-Za-z0-9]+/).filter(Boolean);
  const initials = words.map((w) => w[0]!.toUpperCase()).join("");
  if (initials.length >= 2) return initials.slice(0, 10);
  const compact = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (compact.slice(0, 4) || "CAMPUS").slice(0, 10);
}

export async function uniqueCampusCode(name: string): Promise<string> {
  const base = campusCodeFromName(name);
  for (let i = 0; i < 100; i++) {
    const suffix = i === 0 ? "" : String(i + 1);
    const root = base.slice(0, 10 - suffix.length);
    const candidate = `${root}${suffix}`;
    const found = await prisma.organization.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!found) return candidate;
  }
  return `${base.slice(0, 6)}${Date.now().toString(36).toUpperCase().slice(-4)}`.slice(0, 10);
}
