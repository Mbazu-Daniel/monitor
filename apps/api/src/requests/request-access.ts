import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import type { TenantContext } from "../common/guards/session.types.ts";
import { TenantScope } from "../common/utils/tenant-scope.ts";
import { canView } from "@mivacampus/contracts";

type Db = Pick<PrismaClient, "serviceRequest">;

function requestLookup(idOrReference: string): Prisma.ServiceRequestWhereInput {
  return { OR: [{ id: idOrReference }, { reference: idOrReference }] };
}

export function scopedRequestLookup(scope: TenantScope, idOrReference: string): Prisma.ServiceRequestWhereInput {
  return { AND: [requestLookup(idOrReference), scope.where()] };
}

export async function loadRequestForAction(db: Db, tenant: TenantContext | undefined, idOrReference: string) {
  const scope = TenantScope.of(tenant);
  const request = await db.serviceRequest.findFirst({
    where: scopedRequestLookup(scope, idOrReference),
    include: {
      assignments: { where: { isActive: true }, select: { officerId: true, isActive: true } },
    },
  });
  if (!request) throw new NotFoundException("Request not found.");
  return request;
}

export function assertCanView(
  tenant: TenantContext | undefined,
  request: { creatorId: string; assignments: readonly { officerId: string; isActive: boolean }[] },
): void {
  if (!canView({ role: tenant?.role, id: tenant?.memberId }, request)) {
    throw new ForbiddenException("You do not have permission to view this request.");
  }
}
