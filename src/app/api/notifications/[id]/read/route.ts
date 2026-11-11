import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, fail, requireAuth } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// POST /api/notifications/[id]/read — mark one notification as read
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;
    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== session.sub) return fail("Notification not found.", 404);
    await db.notification.update({ where: { id }, data: { isRead: true } });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
