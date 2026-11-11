import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, fail, requireAuth, notify } from "@/lib/api-helpers";
import { commentSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

// GET /api/requests/[id]/comments
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const request = await db.serviceRequest.findUnique({
      where: { id },
      include: { assignments: { where: { isActive: true }, select: { officerId: true } } },
    });
    if (!request) return fail("Request not found.", 404);

    const allowed =
      session.role === "ADMIN" || request.creatorId === session.sub || request.assignments.some((a) => a.officerId === session.sub);
    if (!allowed) return fail("You do not have permission to view this conversation.", 403);

    const comments = await db.comment.findMany({
      where: { requestId: id },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
    return ok({ comments });
  } catch (err) {
    return handleApiError(err);
  }
}

// POST /api/requests/[id]/comments
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const input = commentSchema.parse(await req.json());

    const request = await db.serviceRequest.findUnique({
      where: { id },
      include: { assignments: { where: { isActive: true }, select: { officerId: true } } },
    });
    if (!request) return fail("Request not found.", 404);

    const allowed =
      session.role === "ADMIN" || request.creatorId === session.sub || request.assignments.some((a) => a.officerId === session.sub);
    if (!allowed) return fail("You do not have permission to comment on this request.", 403);

    const comment = await db.comment.create({
      data: { requestId: id, userId: session.sub, body: input.body },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    // Notify participants (excluding actor)
    if (request.creatorId !== session.sub) {
      await notify(request.creatorId, `New comment on ${request.reference}`, `${session.name}: ${input.body.slice(0, 80)}${input.body.length > 80 ? "…" : ""}`, "COMMENT", id);
    }
    const officerId = request.assignments[0]?.officerId;
    if (officerId && officerId !== session.sub) {
      await notify(officerId, `New comment on ${request.reference}`, `${session.name}: ${input.body.slice(0, 80)}${input.body.length > 80 ? "…" : ""}`, "COMMENT", id);
    }

    return ok({ comment }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
