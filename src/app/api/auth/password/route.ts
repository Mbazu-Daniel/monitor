import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { handleApiError, ok, requireAuth } from "@/lib/api-helpers";
import { changePasswordSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const input = changePasswordSchema.parse(await req.json());

    const user = await db.user.findUnique({ where: { id: session.sub } });
    if (!user || !verifyPassword(input.currentPassword, user.passwordHash)) {
      return ok({ error: "Your current password is incorrect." }, 400);
    }

    await db.user.update({
      where: { id: session.sub },
      data: { passwordHash: hashPassword(input.newPassword) },
    });

    return ok({ success: true, message: "Password updated successfully." });
  } catch (err) {
    return handleApiError(err);
  }
}
