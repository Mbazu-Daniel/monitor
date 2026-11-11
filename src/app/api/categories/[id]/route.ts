import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, fail, requireRole, audit } from "@/lib/api-helpers";
import { categorySchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/categories/[id] — ADMIN only
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    const { id } = await params;
    const input = categorySchema.partial().parse(await req.json());

    const category = await db.category.findUnique({ where: { id } });
    if (!category) return fail("Category not found.", 404);

    if (input.name && input.name !== category.name) {
      const dupe = await db.category.findUnique({ where: { name: input.name } });
      if (dupe) return fail("A category with this name already exists.", 409);
    }

    const updated = await db.category.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.icon ? { icon: input.icon } : {}),
      },
    });
    await audit(session.sub, "CATEGORY_UPDATED", "CATEGORY", id, `${session.name} updated category "${updated.name}"`);
    return ok({ category: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/categories/[id] — ADMIN only (blocked when in use)
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    const { id } = await params;
    const category = await db.category.findUnique({ where: { id }, include: { _count: { select: { requests: true } } } });
    if (!category) return fail("Category not found.", 404);
    if (category._count.requests > 0) {
      return fail(`Cannot delete "${category.name}" — ${category._count.requests} request(s) use it.`, 409);
    }
    await db.category.delete({ where: { id } });
    await audit(session.sub, "CATEGORY_DELETED", "CATEGORY", id, `${session.name} deleted category "${category.name}"`);
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
