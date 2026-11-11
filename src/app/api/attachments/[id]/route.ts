import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fail, requireAuth } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// GET /api/attachments/[id] — stream evidence image (creator / assigned officer / admin only)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;

    const attachment = await db.attachment.findUnique({
      where: { id },
      include: {
        request: {
          select: {
            creatorId: true,
            assignments: { where: { isActive: true }, select: { officerId: true } },
          },
        },
      },
    });
    if (!attachment) return fail("Attachment not found.", 404);

    const allowed =
      session.role === "ADMIN" ||
      attachment.request.creatorId === session.sub ||
      attachment.request.assignments.some((a) => a.officerId === session.sub);
    if (!allowed) return fail("You do not have permission to view this attachment.", 403);

    const buffer = Buffer.from(attachment.data, "base64");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return fail("Failed to load attachment.", 500);
  }
}
