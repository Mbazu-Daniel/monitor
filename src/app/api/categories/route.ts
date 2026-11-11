import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, fail, requireAuth, requireRole, audit } from "@/lib/api-helpers";
import { categorySchema } from "@/lib/validators";

// GET /api/categories — all authenticated users (with request counts)
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const categories = await db.category.findMany({
      include: { _count: { select: { requests: true } } },
      orderBy: { name: "asc" },
    });
    return ok({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/categories — ADMIN only
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    const input = categorySchema.parse(await req.json());

    const existing = await db.category.findUnique({ where: { name: input.name } });
    if (existing) return fail("A category with this name already exists.", 409);

    const category = await db.category.create({
      data: { name: input.name, description: input.description || null, icon: input.icon || "Wrench" },
    });
    await audit(session.sub, "CATEGORY_CREATED", "CATEGORY", category.id, `${session.name} created category "${category.name}"`);
    return ok({ category }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
