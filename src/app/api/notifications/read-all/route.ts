import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, requireAuth } from "@/lib/api-helpers";

// POST /api/notifications/read-all — mark all of the user's notifications as read
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    await db.notification.updateMany({ where: { userId: session.sub, isRead: false }, data: { isRead: true } });
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
