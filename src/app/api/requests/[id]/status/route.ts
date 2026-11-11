import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  handleApiError, ok, fail, requireAuth, audit, notify, notifyAdmins, checkStatusPermission,
} from "@/lib/api-helpers";
import { statusUpdateSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

// POST /api/requests/[id]/status — update status with validation + audit + notifications
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const input = statusUpdateSchema.parse(await req.json());

    const request = await db.serviceRequest.findUnique({
      where: { id },
      include: { assignments: { where: { isActive: true }, select: { officerId: true } } },
    });
    if (!request) return fail("Request not found.", 404);

    const from = request.status;
    const to = input.status;
    if (from === to) return fail(`Request is already ${STATUS_LABELS[to] || to}.`, 409);

    const isAssignedOfficer = request.assignments.some((a) => a.officerId === session.sub);
    const isCreator = request.creatorId === session.sub;

    const permissionError = checkStatusPermission(session, from, to, isAssignedOfficer, isCreator);
    if (permissionError) return fail(permissionError, 403);

    const updated = await db.$transaction(async (tx) => {
      const reqUpdated = await tx.serviceRequest.update({ where: { id }, data: { status: to } });
      await tx.statusLog.create({
        data: {
          requestId: id,
          userId: session.sub,
          fromStatus: from,
          toStatus: to,
          note: input.note || null,
        },
      });
      return reqUpdated;
    });

    await audit(session.sub, "REQUEST_STATUS_CHANGED", "REQUEST", id, `${session.name} set ${request.reference}: ${from} → ${to}`);

    // Notifications (exclude the actor)
    const labelFrom = STATUS_LABELS[from] || from;
    const labelTo = STATUS_LABELS[to] || to;
    const noteSuffix = input.note ? ` Note: ${input.note}` : "";

    if (to === "RESOLVED" && session.role === "OFFICER") {
      await notifyAdmins(
        `Request ${request.reference} resolved`,
        `${session.name} marked "${request.title}" as resolved. Review and close it.`,
        "SUCCESS",
        id
      );
    }
    if (request.creatorId !== session.sub) {
      await notify(
        request.creatorId,
        `Request ${request.reference} is now ${labelTo}`,
        `Status changed from ${labelFrom} to ${labelTo}.${noteSuffix}`,
        to === "RESOLVED" || to === "CLOSED" ? "SUCCESS" : to === "REJECTED" ? "WARNING" : "STATUS",
        id
      );
    }
    const activeOfficer = request.assignments[0]?.officerId;
    if (activeOfficer && activeOfficer !== session.sub) {
      await notify(
        activeOfficer,
        `Request ${request.reference} is now ${labelTo}`,
        `Status changed from ${labelFrom} to ${labelTo}.${noteSuffix}`,
        "STATUS",
        id
      );
    }

    return ok({ request: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
