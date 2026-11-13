import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import { PRISMA } from "../common/constants/prisma-token.ts";
import { AttachmentsService } from "../attachments/attachments.service.ts";
import { TenantScope } from "../common/tenancy/tenant-scope.ts";
import { parsePagination } from "../common/pagination.ts";
import { toActor, creatorActor, officerActor, assignedByActor, logAuthorInclude } from "../common/actor.ts";
import type { TenantContext } from "../common/guards/session.types.ts";
import type { ListQuery } from "../common/dto/list-query.dto.ts";
import { loadRequestForAction, assertCanView, scopedRequestLookup } from "./request-access.ts";

const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function searchClause(search?: string): Prisma.ServiceRequestWhereInput | null {
  if (!search) return null;
  return {
    OR: [
      { reference: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ],
  };
}

function visibilityClause(tenant: TenantContext | undefined, scope: TenantScope): Prisma.ServiceRequestWhereInput | null {
  if (tenant?.role === "STUDENT" || tenant?.role === "STAFF") {
    return { creatorId: scope.memberIdOrNoMatch() };
  }
  if (tenant?.role === "OFFICER") {
    return { assignments: { some: { officerId: scope.memberIdOrNoMatch(), isActive: true } } };
  }
  return null;
}

function optionalClauses(query: ListQuery): Prisma.ServiceRequestWhereInput[] {
  const out: Prisma.ServiceRequestWhereInput[] = [];
  if (query.status) out.push({ status: query.status });
  if (query.priority) out.push({ priority: query.priority });
  if (query.categoryId) out.push({ categoryId: query.categoryId });
  return out;
}

const readyAttachments = {
  where: { status: "READY" },
  select: { id: true, key: true, fileName: true, mimeType: true, sizeBytes: true, status: true, createdAt: true },
} as const;

const listInclude = {
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
} as const;

type ListItem = Prisma.ServiceRequestGetPayload<{ include: typeof listInclude }>;

@Injectable()
export class RequestsService {
  constructor(
    @Inject(PRISMA) private readonly db: PrismaClient,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  private buildWhere(query: ListQuery, tenant: TenantContext | undefined) {
    const search = query.search;
    const scope = TenantScope.of(tenant);

    const and: Prisma.ServiceRequestWhereInput[] = [scope.where()];
    const visibility = visibilityClause(tenant, scope);
    if (visibility) and.push(visibility);

    const searchOr = searchClause(search);
    if (searchOr) and.push(searchOr);

    and.push(...optionalClauses(query));

    return { where: and.length > 1 ? { AND: and } : and[0], includeAssignments: tenant?.role !== "STUDENT" && tenant?.role !== "STAFF" };
  }

  private mapListItem(item: ListItem, includeAssignments: boolean) {
    return {
      ...item,
      creator: toActor(item.creator),
      assignments: includeAssignments
        ? item.assignments.map((a) => ({
            ...a,
            officer: toActor(a.officer),
            assignedByUser: toActor(a.assignedByUser),
          }))
        : undefined,
    };
  }

  async listFor(query: ListQuery, tenant: TenantContext | undefined) {
    const { page, pageSize, skip, take } = parsePagination(query);
    const sort = query.sort ?? "newest";
    const { where, includeAssignments } = this.buildWhere(query, tenant);

    const [total, items] = await Promise.all([
      this.db.serviceRequest.count({ where }),
      this.db.serviceRequest.findMany({
        where,
        include: listInclude,
        orderBy: sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    const mapped = items.map((item) => this.mapListItem(item, includeAssignments));

    const out = sort === "priority"
      ? [...mapped].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
      : mapped;

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

    const attachments = await this.attachmentsService.presign(request.attachments);
    return {
      request: {
        ...request,
        creator: toActor(request.creator),
        attachments: attachments.map(({ key: _key, ...a }) => a),
        assignments: request.assignments.map((a) => ({
          ...a,
          officer: toActor(a.officer),
          assignedByUser: toActor(a.assignedByUser),
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
