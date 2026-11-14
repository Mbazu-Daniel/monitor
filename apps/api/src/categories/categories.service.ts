import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PRISMA } from "../common/constants/prisma-token.ts";
import type { PrismaClient } from "../generated/prisma/client.ts";
import { AuditSink } from "../common/audit/audit.ts";
import { isForeignKeyViolation } from "../common/db-errors.ts";
import type { TenantContext } from "../common/guards/session.types.ts";
import type { CategoryDto } from "./categories.dto.ts";

@Injectable()
export class CategoriesService {
  constructor(@Inject(PRISMA) private readonly db: PrismaClient, private readonly auditSink: AuditSink) {}
  async list(organizationId: string | null) {
    const categories = await this.db.category.findMany({
      where: { OR: [{ organizationId: null }, ...(organizationId ? [{ organizationId }] : [])] },
      include: { _count: { select: { requests: { where: { organizationId } } } } },
      orderBy: { name: "asc" },
    });
    return { categories };
  }

  private findDuplicateName(name: string, organizationId: string | null) {
    return this.db.category.findFirst({ where: { name, OR: [{ organizationId: null }, ...(organizationId ? [{ organizationId }] : [])] } });
  }

  async create(dto: CategoryDto, user: { id: string; name: string }, tenant: TenantContext | undefined) {
    const organizationId = tenant?.organizationId ?? null;
    const existing = await this.findDuplicateName(dto.name, organizationId);
    if (existing) throw new ConflictException("A category with this name already exists.");

    const category = await this.db.category.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        icon: dto.icon || "Wrench",
        organizationId,
      },
    });
    await this.auditSink.platform({ userId: user.id, memberId: tenant?.memberId ?? null, action: "CATEGORY_CREATED", entityType: "CATEGORY", entityId: category.id, details: `${user.name} created category "${category.name}"`, organizationId });
    return { category };
  }

  private async findInTenant(id: string, organizationId: string | null) {
    const category = await this.db.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException("Category not found.");
    if (category.organizationId !== null && category.organizationId !== organizationId) {
      throw new NotFoundException("Category not found.");
    }
    return category;
  }

  async update(id: string, dto: Partial<CategoryDto>, user: { id: string; name: string }, tenant: TenantContext | undefined) {
    const organizationId = tenant?.organizationId ?? null;
    const category = await this.findInTenant(id, organizationId);

    if (dto.name && dto.name !== category.name) {
      const dupe = await this.findDuplicateName(dto.name, organizationId);
      if (dupe) throw new ConflictException("A category with this name already exists.");
    }

    const updated = await this.db.category.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.icon ? { icon: dto.icon } : {}),
      },
    });
    await this.auditSink.platform({ userId: user.id, memberId: tenant?.memberId ?? null, action: "CATEGORY_UPDATED", entityType: "CATEGORY", entityId: id, details: `${user.name} updated category "${updated.name}"`, organizationId });
    return { category: updated };
  }

  async remove(id: string, user: { id: string; name: string }, tenant: TenantContext | undefined) {
    const organizationId = tenant?.organizationId ?? null;
    const category = await this.findInTenant(id, organizationId);

    const usageWhere = category.organizationId === null
      ? { categoryId: id }
      : { categoryId: id, organizationId };
    const total = await this.db.serviceRequest.count({ where: usageWhere });
    if (total > 0) {
      throw new ConflictException(`Cannot delete "${category.name}": ${total} request(s) use it.`);
    }

    try {
      await this.db.category.delete({ where: { id } });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException(`Cannot delete "${category.name}": it is used by request(s).`);
      }
      throw error;
    }
    await this.auditSink.platform({ userId: user.id, memberId: tenant?.memberId ?? null, action: "CATEGORY_DELETED", entityType: "CATEGORY", entityId: id, details: `${user.name} deleted category "${category.name}"`, organizationId });
    return { success: true };
  }
}
