import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, requireAuth } from "@/lib/api-helpers";
import { profileUpdateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const user = await db.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true, name: true, email: true, role: true, department: true,
        phone: true, matricNo: true, createdAt: true,
      },
    });
    if (!user) return ok({ user: null }, 401);
    return ok({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const input = profileUpdateSchema.parse(await req.json());
    const user = await db.user.update({
      where: { id: session.sub },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.department !== undefined ? { department: input.department || null } : {}),
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      },
      select: {
        id: true, name: true, email: true, role: true, department: true,
        phone: true, matricNo: true, createdAt: true,
      },
    });
    return ok({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
