import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { handleApiError, ok, requireRole, audit, parsePagination } from "@/lib/api-helpers";
import { createUserSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/auth";

// GET /api/users — ADMIN only (staff directory + officer lists)
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN"]);
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const search = url.searchParams.get("search")?.trim();
    const role = url.searchParams.get("role");

    const where: Prisma.UserWhereInput = {};
    const and: Prisma.UserWhereInput[] = [];
    if (search) {
      and.push({
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { department: { contains: search } },
          { matricNo: { contains: search } },
        ],
      });
    }
    if (role) and.push({ role });
    if (and.length) where.AND = and;

    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, department: true,
          phone: true, matricNo: true, isActive: true, createdAt: true,
          _count: { select: { requests: true, assignments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    return ok({ items: users, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/users — ADMIN creates any user (incl. officers and admins)
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    const input = createUserSchema.parse(await req.json());

    const existing = await db.user.findUnique({ where: { email: input.email } });
    if (existing) return ok({ error: "A user with this email already exists." }, 409);

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
      select: {
        id: true, name: true, email: true, role: true, department: true,
        phone: true, matricNo: true, isActive: true, createdAt: true,
      },
    });
    await audit(session.sub, "USER_CREATED", "USER", user.id, `${session.name} created ${input.role} account for ${user.email}`);
    return ok({ user }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
