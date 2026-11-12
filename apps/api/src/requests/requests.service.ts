import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { AttachmentsService } from "../attachments/attachments.service.ts";
import { TenantScope } from "../common/utils/tenant-scope.ts";
import { parsePagination } from "../common/utils/pagination.ts";
import { toActor, creatorActor, officerActor, assignedByActor, logAuthorInclude } from "../common/utils/actor.ts";
import type { TenantContext } from "../common/guards/session.guard.ts";
import { loadRequestForAction, assertCanView, scopedRequestLookup } from "./request-access.ts";

const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const readyAttachments = {
  where: { status: "READY" },
  select: { id: true, key: true, fileName: true, mimeType: true, sizeBytes: true, status: true, createdAt: true },
} as const;

type MemberHolder = { role: string; user: Record<string, unknown> } | null | undefined;

@Injectable()
export class RequestsService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  private mapAttachments(attachments: { id: string; key: string; fileName: string; mimeType: string; sizeBytes: number | null; status: string; createdAt: Date }[]) {
    return this.attachmentsService.presign(attachments);
  }

  async listFor(query: Record<string, unknown>, tenant: TenantContext | undefined) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const search = typeof query.search === "string" ? query.search.trim() : undefined;
    const status = typeof query.status === "string" ? query.status : undefined;
    const priority = typeof query.priority === "string" ? query.priority : undefined;
    const categoryId = typeof query.categoryId === "string" ? query.categoryId : undefined;
    const sort = typeof query.sort === "string" ? query.sort : "newest";

    const scope = TenantScope.of(tenant);
    const includeAssignments = tenant?.role !== "STUDENT" && tenant?.role !== "STAFF";

    const and: Prisma.ServiceRequestWhereInput[] = [scope.where()];

    if (tenant?.role === "STUDENT" || tenant?.role === "STAFF") {
      and.push({ creatorId: scope.memberIdOrNoMatch() });
    } else if (tenant?.role === "OFFICER") {
      and.push({ assignments: { some: { officerId: scope.memberIdOrNoMatch(), isActive: true } } });
    }

    if (search) {
      and.push({
        OR: [
          { reference: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (status) and.push({ status });
    if (priority) and.push({ priority });
    if (categoryId) and.push({ categoryId });

    const where: Prisma.ServiceRequestWhereInput = and.length > 1 ? { AND: and } : and[0];

    const [total, items] = await Promise.all([
      this.db.serviceRequest.count({ where }),
      this.db.serviceRequest.findMany({
        where,
        include: {
          category: true,
          creator: creatorActor,
          attachments: { where: { status: "READY" }, select: { id: true } },
          _count: { select: { comments: true } },
          assignments: {
            where: { isActive: true },
            select: {
              id: true,
              note: true,
              isActive: true,
              createdAt: true,
              releasedAt: true,
              officer: officerActor,
              assignedByUser: assignedByActor,
            },
          },
        },
        orderBy: sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    const mapped = items.map((item) => {
      const itemAssignments = Array.isArray(item.assignments) ? item.assignments : [];
      return {
        ...item,
        creator: toActor(item.creator as MemberHolder),
        assignments: includeAssignments
          ? itemAssignments.map((a) => ({
              ...a,
              officer: toActor(a.officer as MemberHolder),
              assignedByUser: toActor(a.assignedByUser as MemberHolder),
            }))
          : undefined,
      };
    });

    let out = mapped as unknown as Array<Record<string, unknown>>;
    if (sort === "priority") {
      out = [...out].sort((a, b) => (PRIORITY_RANK[a.priority as string] ?? 9) - (PRIORITY_RANK[b.priority as string] ?? 9));
    }

    return { items: out, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async getDetail(idOrReference: string, tenant: TenantContext | undefined) {
    const scope = TenantScope.of(tenant);
    const request = await this.db.serviceRequest.findFirst({
      where: scopedRequestLookup(scope, idOrReference),
      include: {
        category: true,
        creator: creatorActor,
        attachments: readyAttachments,
        assignments: {
          include: {
            officer: officerActor,
            assignedByUser: assignedByActor,
          },
          orderBy: { createdAt: "desc" },
        },
        statusLogs: {
          include: { member: logAuthorInclude },
          orderBy: { createdAt: "asc" },
        },
        comments: {
          include: { member: logAuthorInclude },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!request) throw new NotFoundException("Request not found.");
    assertCanView(tenant, request);

    const attachments = await this.mapAttachments(request.attachments);
    return {
      request: {
        ...request,
        creator: toActor(request.creator as MemberHolder),
        attachments: attachments.map(({ key: _key, ...a }) => a),
        assignments: request.assignments.map((a) => ({
          ...a,
          officer: toActor(a.officer as MemberHolder),
          assignedByUser: toActor(a.assignedByUser as MemberHolder),
        })),
        statusLogs: request.statusLogs.map(({ member, ...log }) => ({
          ...log,
          user: member ? { id: member.user.id, name: member.user.name, role: member.role } : null,
        })),
        comments: request.comments.map(({ member, ...comment }) => ({
          ...comment,
          user: member ? { id: member.user.id, name: member.user.name, role: member.role } : null,
        })),
      },
    };
  }

  async listComments(id: string, tenant: TenantContext | undefined) {
    const request = await loadRequestForAction(this.db, tenant, id);
    assertCanView(tenant, request);

    const comments = await this.db.comment.findMany({
      where: { requestId: id },
      include: { member: logAuthorInclude },
      orderBy: { createdAt: "asc" },
    });
    return {
      comments: comments.map(({ member, ...comment }) => ({
        ...comment,
        user: member ? { id: member.user.id, name: member.user.name, role: member.role } : null,
      })),
    };
  }
}
