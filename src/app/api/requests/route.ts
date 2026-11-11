import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  handleApiError, ok, requireAuth, audit, notify, notifyAdmins,
  generateReference, parsePagination,
} from "@/lib/api-helpers";
import { createRequestSchema } from "@/lib/validators";

const includeForList = {
  category: true,
  creator: { select: { id: true, name: true, email: true, role: true, department: true, matricNo: true } },
  attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
  _count: { select: { comments: true } },
};

// GET /api/requests — role-scoped, searchable, filterable, paginated list
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = parsePagination(url);
    const search = url.searchParams.get("search")?.trim();
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const categoryId = url.searchParams.get("categoryId");
    const sort = url.searchParams.get("sort") || "newest";

    const where: Prisma.ServiceRequestWhereInput = {};
    const and: Prisma.ServiceRequestWhereInput[] = [];

    // Role-based scoping (RBAC)
    if (session.role === "STUDENT" || session.role === "STAFF") {
      where.creatorId = session.sub;
    } else if (session.role === "OFFICER") {
      where.assignments = { some: { officerId: session.sub, isActive: true } };
    }

    if (search) {
      const searchWhere: Prisma.ServiceRequestWhereInput = {
        OR: [
          { reference: { contains: search } },
          { title: { contains: search } },
          { description: { contains: search } },
          { location: { contains: search } },
        ],
      };
      and.push(searchWhere);
    }
    if (status) and.push({ status });
    if (priority) and.push({ priority });
    if (categoryId) and.push({ categoryId });

    if (and.length) where.AND = and;

    const orderBy: Prisma.ServiceRequestOrderByWithRelationInput =
      sort === "oldest" ? { createdAt: "asc" } : sort === "priority" ? { createdAt: "desc" } : { createdAt: "desc" };

    const [total, items] = await Promise.all([
      db.serviceRequest.count({ where }),
      db.serviceRequest.findMany({
        where,
        include: {
          ...includeForList,
          assignments: session.role !== "STUDENT" && session.role !== "STAFF"
            ? { where: { isActive: true }, include: { officer: { select: { id: true, name: true, email: true, phone: true, department: true } }, assignedByUser: { select: { id: true, name: true } } } }
            : false,
        },
        orderBy,
        skip,
        take,
      }),
    ]);

    // For priority sort, do a client-side stable re-order by priority rank then createdAt
    let rows = items as unknown as import("@/types").ServiceRequestRow[];
    if (sort === "priority") {
      const rank = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
      rows = [...rows].sort((a, b) => rank[a.priority] - rank[b.priority]);
    }

    return ok({ items: rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/requests — create a new service request (any authenticated user)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const input = createRequestSchema.parse(await req.json());

    const category = await db.category.findUnique({ where: { id: input.categoryId } });
    if (!category) return ok({ error: "The selected category no longer exists." }, 400);

    const reference = await generateReference();
    const request = await db.serviceRequest.create({
      data: {
        reference,
        title: input.title,
        description: input.description,
        location: input.location,
        priority: input.priority,
        status: "OPEN",
        categoryId: input.categoryId,
        creatorId: session.sub,
        attachments: {
          create: (input.attachments || []).map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.size,
            data: a.data,
          })),
        },
      },
      include: { category: true },
    });

    await db.statusLog.create({
      data: { requestId: request.id, userId: session.sub, fromStatus: null, toStatus: "OPEN", note: "Request submitted" },
    });

    await audit(session.sub, "REQUEST_CREATED", "REQUEST", request.id, `${session.name} submitted ${reference} (${category.name})`);
    await notifyAdmins(
      `New ${input.priority === "URGENT" ? "URGENT " : ""}request ${reference}`,
      `${session.name} reported "${input.title}" at ${input.location}.`,
      input.priority === "URGENT" ? "WARNING" : "INFO",
      request.id
    );
    await notify(
      session.sub,
      `Request ${reference} submitted`,
      "We have received your request. You will be notified when it is assigned and worked on.",
      "SUCCESS",
      request.id
    );

    return ok({ request }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
