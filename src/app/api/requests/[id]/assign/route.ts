import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, fail, requireRole, requireAuth, audit, notify } from "@/lib/api-helpers";
import { assignSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

// POST /api/requests/[id]/assign — ADMIN assigns a maintenance officer
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    const { id } = await params;
    const input = assignSchema.parse(await req.json());

    const request = await db.serviceRequest.findUnique({ where: { id }, include: { category: true } });
    if (!request) return fail("Request not found.", 404);
    if (["CLOSED", "REJECTED"].includes(request.status)) {
      return fail(`Cannot assign a request that is ${request.status}.`, 409);
    }

    const officer = await db.user.findUnique({ where: { id: input.officerId } });
    if (!officer || officer.role !== "OFFICER") return fail("Selected user is not a maintenance officer.", 400);
    if (!officer.isActive) return fail("This officer's account is inactive.", 400);

    // Release any previous active assignment (reassignment keeps history)
    await db.assignment.updateMany({
      where: { requestId: id, isActive: true },
      data: { isActive: false, releasedAt: new Date() },
    });

    const assignment = await db.assignment.create({
      data: {
        requestId: id,
        officerId: officer.id,
        assignedById: session.sub,
        note: input.note || null,
      },
      include: { officer: { select: { id: true, name: true, email: true, phone: true, department: true } }, assignedByUser: { select: { id: true, name: true } } },
    });

    const wasOpen = request.status === "OPEN";
    if (wasOpen) {
      await db.serviceRequest.update({ where: { id }, data: { status: "ASSIGNED" } });
      await db.statusLog.create({
        data: { requestId: id, userId: session.sub, fromStatus: request.status, toStatus: "ASSIGNED", note: `Assigned to ${officer.name}` },
      });
    }

    await audit(session.sub, "REQUEST_ASSIGNED", "REQUEST", id, `${session.name} assigned ${request.reference} to ${officer.name}`);
    await notify(
      officer.id,
      `New assignment: ${request.reference}`,
      `You have been assigned "${request.title}" at ${request.location} (${request.priority} priority).`,
      "ASSIGNMENT",
      id
    );
    await notify(
      request.creatorId,
      `Request ${request.reference} assigned`,
      `Your request has been assigned to ${officer.name} from the maintenance team.`,
      "STATUS",
      id
    );

    return ok({ assignment, status: wasOpen ? "ASSIGNED" : request.status });
  } catch (err) {
    return handleApiError(err);
  }
}

// DELETE /api/requests/[id]/assign — ADMIN unassigns the active officer
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(req);
    if (session.role !== "ADMIN") return fail("Only administrators can unassign requests.", 403);
    const { id } = await params;

    const request = await db.serviceRequest.findUnique({ where: { id } });
    if (!request) return fail("Request not found.", 404);

    const active = await db.assignment.findFirst({ where: { requestId: id, isActive: true } });
    if (!active) return fail("This request has no active assignment.", 409);

    await db.assignment.update({ where: { id: active.id }, data: { isActive: false, releasedAt: new Date() } });
    await db.serviceRequest.update({ where: { id }, data: { status: "OPEN" } });
    await db.statusLog.create({
      data: { requestId: id, userId: session.sub, fromStatus: request.status, toStatus: "OPEN", note: "Assignment removed — returned to queue" },
    });

    await audit(session.sub, "REQUEST_UNASSIGNED", "REQUEST", id, `${session.name} unassigned ${request.reference}`);
    await notify(request.creatorId, `Request ${request.reference} re-queued`, "The assignment on your request was removed. It is back in the open queue.", "WARNING", id);

    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
