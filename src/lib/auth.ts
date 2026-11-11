import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Authentication utilities.
 * - Passwords: scrypt with per-user random salt (never stored in plaintext)
 * - Sessions: JWT (HS256) stored in an httpOnly cookie
 */

const SECRET = process.env.AUTH_SECRET || "ums-dev-secret-change-in-production-9f2b";
export const SESSION_COOKIE = "ums_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export type UserRole = "STUDENT" | "STAFF" | "OFFICER" | "ADMIN";

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// ---------------- Password hashing (scrypt) ----------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(":");
    if (!salt || !key) return false;
    const derived = scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(key, "hex");
    if (keyBuf.length !== derived.length) return false;
    return timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

// ---------------- JWT (HS256, no external dependency) ----------------

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(data: string): string {
  return b64url(createHmac("sha256", SECRET).update(data).digest());
}

export function signToken(payload: Omit<SessionPayload, "iat" | "exp">): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body: SessionPayload = { ...payload, iat: now, exp: now + SESSION_MAX_AGE };
  const payloadB64 = b64url(JSON.stringify(body));
  const signature = sign(`${header}.${payloadB64}`);
  return `${header}.${payloadB64}.${signature}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payloadB64, signature] = parts;
    const expected = sign(`${header}.${payloadB64}`);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(b64urlDecode(payloadB64).toString()) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------- Session extraction from requests ----------------

export function getSessionFromRequest(req: Request): SessionPayload | null {
  // Read cookie from the request headers directly (works in route handlers).
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        return [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      })
  );
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return verifyToken(token);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
