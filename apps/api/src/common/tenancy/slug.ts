import { prisma } from "../prisma.ts";

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}


export async function uniqueSlug(base: string): Promise<string> {
  const root = base || "campus";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const found = await prisma.organization.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!found) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
