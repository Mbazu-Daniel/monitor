import {
  Inject,
  Injectable,
} from "@nestjs/common";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { NotificationAnnouncer } from "../notifications/notification-announcer.ts";
import { TenantScope } from "../common/tenancy/tenant-scope.ts";
import type { CommentDto } from "@mivacampus/contracts";
import type { TenantContext } from "../common/guards/session.types.ts";
import { RealtimeService } from "../realtime/realtime.service.ts";
import { loadRequestForAction, assertCanView } from "./request-access.ts";
import { memberUserId } from "./request-shared.ts";

@Injectable()
export class CommentsService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationAnnouncer,
  ) {}

  async createComment(user: { id: string; name: string }, id: string, dto: CommentDto, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const memberId = scope.requireMemberId("You must be in a campus to comment.");
    const request = await loadRequestForAction(this.db, tenant, id);
    id = request.id;
    assertCanView(tenant, request);
    const organizationId = scope.organizationId;

    const created = await this.db.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { requestId: id, memberId, body: dto.body },
        include: { member: { select: { role: true, user: { select: { id: true, name: true } } } } },
      });

      const notifyUserIds = new Set<string>();
      if (request.creatorId !== memberId) {
        const creatorUserId = await memberUserId(tx, request.creatorId);
        if (creatorUserId) notifyUserIds.add(creatorUserId);
      }
      const officerId = request.assignments[0]?.officerId;
      if (officerId && officerId !== memberId) {
        const officerUserId = await memberUserId(tx, officerId);
        if (officerUserId) notifyUserIds.add(officerUserId);
      }
      if (notifyUserIds.size) {
        await this.notifications.announce(
          {
            title: `New comment on ${request.reference}`,
            message: `${user.name}: ${dto.body.slice(0, 80)}${dto.body.length > 80 ? "…" : ""}`,
            type: "COMMENT",
            requestId: id,
            organizationId,
          },
          { userIds: [...notifyUserIds] },
          tx,
        );
      }
      return comment;
    });
    const comment = {
      ...created,
      user: created.member ? { id: created.member.user.id, name: created.member.user.name, role: created.member.role } : null,
    };

    this.realtime.emit({
      type: "REQUEST_COMMENT",
      organizationId: tenant?.organizationId ?? null,
      requestId: id,
      reference: request.reference,
      title: request.title,
      actorId: user.id,
      actorName: user.name,
    });

    return { comment };
  }
}
