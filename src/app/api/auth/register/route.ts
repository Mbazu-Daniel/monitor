import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, SESSION_COOKIE, sessionCookieOptions, signToken } from "@/lib/auth";
import { handleApiError, fail, audit } from "@/lib/api-helpers";
import { registerSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = registerSchema.parse(body);

    const existing = await db.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return fail("An account with this email already exists. Try signing in instead.", 409);
    }

    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: hashPassword(input.password),
        role: input.role,
        department: input.department || null,
        phone: input.phone || null,
        matricNo: input.matricNo || null,
      },
    });

    await audit(user.id, "USER_REGISTERED", "USER", user.id, `Self-registration as ${input.role}`);

    const token = signToken({ sub: user.id, email: user.email, name: user.name, role: user.role as never });
    const res = NextResponse.json(
      {
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
      },
      { status: 201 }
    );
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
