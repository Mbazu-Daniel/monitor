import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ok, requireAuth, parsePagination } from "@/lib/api-helpers";

// GET /api/notifications — current user's notifications + unread count
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const url = new URL(req.url);
    const { skip, take } = parsePagination(url);

    const [items, unread, total] = await Promise.all([
      db.notification.findMany({
        where: { userId: session.sub },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      db.notification.count({ where: { userId: session.sub, isRead: false } }),
      db.notification.count({ where: { userId: session.sub } }),
    ]);

    return ok({ items, unread, total });
  } catch (err) {
    return handleApiError(err);
  }
}
