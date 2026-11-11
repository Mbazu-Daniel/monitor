import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/auth";
import { audit } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (session) {
    await audit(session.sub, "USER_LOGOUT", "AUTH", session.sub, `${session.name} signed out`);
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
