import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, fail, requireRole, audit } from "@/lib/api-helpers";
import { updateUserSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/users/[id] — ADMIN updates role, status, details or resets password
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    const { id } = await params;
    const input = updateUserSchema.parse(await req.json());

    const target = await db.user.findUnique({ where: { id } });
    if (!target) return fail("User not found.", 404);

    // Guard rails: cannot demote or deactivate yourself
    if (target.id === session.sub) {
      if (input.role && input.role !== "ADMIN") return fail("You cannot change your own role.", 400);
      if (input.isActive === false) return fail("You cannot deactivate your own account.", 400);
    }
    // Last-admin protection
    if (target.role === "ADMIN" && input.role && input.role !== "ADMIN") {
      const adminCount = await db.user.count({ where: { role: "ADMIN", isActive: true } });
      if (adminCount <= 1) return fail("Cannot demote the only active administrator.", 400);
    }

    const user = await db.user.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.role ? { role: input.role } : {}),
        ...(input.department !== undefined ? { department: input.department || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.matricNo !== undefined ? { matricNo: input.matricNo || null } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
      },
      select: {
        id: true, name: true, email: true, role: true, department: true,
        phone: true, matricNo: true, isActive: true, createdAt: true,
      },
    });

    const changes = Object.keys(input).filter((k) => k !== "password").join(", ");
    await audit(session.sub, "USER_UPDATED", "USER", id, `${session.name} updated ${target.name} (${changes || "profile"})${input.password ? " + password reset" : ""}`);
    return ok({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
