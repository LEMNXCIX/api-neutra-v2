import { Permission as PrismaPermission, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import { IPermissionRepository, PermissionCreateData, PermissionUpdateData } from "@/core/repositories/permission.repository.interface";
import { Permission } from "@/core/entities/permission.entity";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

export class PrismaPermissionRepository implements IPermissionRepository {
    private mapToEntity(data: PrismaPermission): Permission {
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            active: data.active,
            createdAt: data.createdAt,
        };
    }

    private buildTenantWhere(
        tenantId: string | undefined,
    ): Prisma.PermissionWhereInput {
        if (tenantId) {
            return { OR: [{ tenantId }, { tenantId: null }] };
        }
        return {};
    }

    async findAll(tenantId: string | undefined): Promise<Permission[]> {
        const where = this.buildTenantWhere(tenantId);

        const permissions = await prisma.permission.findMany({
            where,
            orderBy: { name: "asc" },
        });
        return permissions.map((p) => this.mapToEntity(p));
    }

    async findAllPaginated(
        tenantId: string | undefined,
        page: number,
        limit: number,
        search?: string,
    ): Promise<{ permissions: Permission[]; total: number }> {
        const skip = (page - 1) * limit;
        const where: Prisma.PermissionWhereInput =
            this.buildTenantWhere(tenantId);

        if (search) {
            where.name = { contains: search, mode: "insensitive" as const };
        }

        const [permissions, total] = await Promise.all([
            prisma.permission.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: "asc" },
            }),
            prisma.permission.count({ where }),
        ]);

        return {
            permissions: permissions.map((p) => this.mapToEntity(p)),
            total,
        };
    }

    async findById(
        tenantId: string | undefined,
        id: string,
    ): Promise<Permission | null> {
        // Scoped in the query, not by a filter over a global read. The
        // previous shape was `findUnique({ where: { id } })` with the tenant
        // test applied to the returned row, which meant the row crossed the
        // repository boundary unscoped and the answer depended on a comparison
        // happening afterwards. Same idiom the role repository's `findById`
        // already uses, so the two cannot drift apart.
        const where: Prisma.PermissionWhereInput = {
            id,
            ...this.buildTenantWhere(tenantId),
        };

        const permission = await prisma.permission.findFirst({ where });

        return permission ? this.mapToEntity(permission) : null;
    }

    async findByName(
        tenantId: string | undefined,
        name: string,
    ): Promise<Permission | null> {
        const where: Prisma.PermissionWhereInput = {
            name,
            ...this.buildTenantWhere(tenantId),
        };

        const permission = await prisma.permission.findFirst({ where });
        return permission ? this.mapToEntity(permission) : null;
    }

    async create(
        tenantId: string | undefined,
        data: PermissionCreateData,
    ): Promise<Permission> {
        try {
            const permission = await prisma.permission.create({
                data: {
                    name: data.name,
                    description: data.description,
                    active: data.active ?? true,
                    tenantId: tenantId || null,
                },
            });
            return this.mapToEntity(permission);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "name";
                throw new DuplicateEntityError("Permission", target, data.name);
            }
            throw error;
        }
    }

    /**
     * One statement carrying the scope, so a row cannot change owner between
     * a read and the write. `updateMany` rather than `update` because
     * `Permission.tenantId` is nullable, so `{ id, tenantId }` is not a unique
     * selector Prisma will take in `where` — the only way to carry the tenant
     * in a write predicate is `buildTenantWhere`'s own-rows-plus-global form.
     * Same shape as `PrismaUserRepository.updateForTenant`, and a count of
     * zero answers with the same `EntityNotFoundError` the global path
     * already threw, so a caller cannot tell the two apart.
     */
    async update(
        tenantId: string | undefined,
        id: string,
        data: PermissionUpdateData,
    ): Promise<Permission> {
        const where: Prisma.PermissionWhereInput = {
            id,
            ...this.buildTenantWhere(tenantId),
        };

        try {
            const { count } = await prisma.permission.updateMany({
                where,
                data: {
                    name: data.name,
                    description: data.description,
                    active: data.active,
                },
            });

            // The row is not writable in this scope: it belongs to another
            // tenant, or it was reassigned after the use case read it. A
            // success here would claim a write that never happened.
            if (count === 0) {
                throw new EntityNotFoundError("Permission", id);
            }

            // `updateMany` returns no row, so the updated permission is read
            // back through the same tenant-scoped lookup the global update's
            // return value used to come from.
            const updated = await this.findById(tenantId, id);

            if (!updated) {
                throw new EntityNotFoundError("Permission", id);
            }

            return updated;
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "name";
                throw new DuplicateEntityError(
                    "Permission",
                    target,
                    data.name ?? "",
                );
            }
            throw error;
        }
    }

    async delete(tenantId: string | undefined, id: string): Promise<void> {
        // Same one-statement reasoning as `update`. `RolePermission.permission`
        // is `onDelete: Cascade`, and `deleteMany` issues the same DELETE the
        // single-row form did, so the cascade is unchanged.
        const where: Prisma.PermissionWhereInput = {
            id,
            ...this.buildTenantWhere(tenantId),
        };

        const { count } = await prisma.permission.deleteMany({ where });

        if (count === 0) {
            throw new EntityNotFoundError("Permission", id);
        }
    }

    async upsertByName(
        tenantId: string,
        name: string,
        description: string,
    ): Promise<Permission> {
        const existing = await prisma.permission.findUnique({
            where: { name },
        });

        if (existing) {
            return this.mapToEntity(existing);
        }

        const permission = await prisma.permission.create({
            data: {
                name,
                description,
                active: true,
                tenantId,
            },
        });
        return this.mapToEntity(permission);
    }
}
