import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  handleApiError, ok, fail, requireAuth, audit,
} from "@/lib/api-helpers";
import { updateRequestSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

async function loadRequest(id: string) {
  return db.serviceRequest.findUnique({
    where: { id },
    include: {
      category: true,
      creator: { select: { id: true, name: true, email: true, role: true, department: true, matricNo: true } },
      attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
      assignments: {
        include: {
          officer: { select: { id: true, name: true, email: true, phone: true, department: true } },
          assignedByUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      statusLogs: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
      comments: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
}

function canView(session: { sub: string; role: string }, request: { creatorId: string; assignments: { officerId: string; isActive: boolean }[] }) {
  if (session.role === "ADMIN") return true;
  if (request.creatorId === session.sub) return true;
  if (session.role === "OFFICER" && request.assignments.some((a) => a.officerId === session.sub && a.isActive)) return true;
  return false;
}

// GET /api/requests/[id]
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const request = await loadRequest(id);
    if (!request) return fail("Request not found.", 404);
    if (!canView(session, request)) return fail("You do not have permission to view this request.", 403);
    return ok({ request });
  } catch (err) {
    return handleApiError(err);
  }
}

// PATCH /api/requests/[id] — edit request details
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const request = await db.serviceRequest.findUnique({ where: { id } });
    if (!request) return fail("Request not found.", 404);

    const isOwner = request.creatorId === session.sub;
    const isAdmin = session.role === "ADMIN";
    if (!isOwner && !isAdmin) return fail("You can only edit your own requests.", 403);
    if (isOwner && !isAdmin && request.status !== "OPEN") {
      return fail("This request is already being processed. Contact the maintenance office to make changes.", 409);
    }

    const input = updateRequestSchema.parse(await req.json());
    const updated = await db.serviceRequest.update({
      where: { id },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.location ? { location: input.location } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      },
    });

    await audit(session.sub, "REQUEST_UPDATED", "REQUEST", id, `${session.name} updated ${request.reference}`);
    return ok({ request: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/requests/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const request = await db.serviceRequest.findUnique({ where: { id } });
    if (!request) return fail("Request not found.", 404);

    const isOwner = request.creatorId === session.sub;
    const isAdmin = session.role === "ADMIN";
    if (!isAdmin && !(isOwner && request.status === "OPEN")) {
      return fail("You can only delete your own request while it is still OPEN.", 403);
    }

    await db.serviceRequest.delete({ where: { id } });
    await audit(session.sub, "REQUEST_DELETED", "REQUEST", id, `${session.name} deleted ${request.reference}`);
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
