import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, SESSION_COOKIE, sessionCookieOptions, signToken } from "@/lib/auth";
import { handleApiError, fail, audit } from "@/lib/api-helpers";
import { loginSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = loginSchema.parse(body);

    const user = await db.user.findUnique({ where: { email: input.email } });
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      await audit(null, "LOGIN_FAILED", "AUTH", null, `Failed sign-in attempt for ${input.email}`);
      return fail("Invalid email or password. Please try again.", 401);
    }
    if (!user.isActive) {
      return fail("Your account has been deactivated. Please contact an administrator.", 403);
    }

    await audit(user.id, "USER_LOGIN", "AUTH", user.id, `${user.name} signed in`);

    const token = signToken({ sub: user.id, email: user.email, name: user.name, role: user.role as never });
    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        matricNo: user.matricNo,
        createdAt: user.createdAt,
      },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
