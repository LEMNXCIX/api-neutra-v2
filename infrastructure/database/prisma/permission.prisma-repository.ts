import { Permission as PrismaPermission, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import { IPermissionRepository } from "@/core/repositories/permission.repository.interface";
import { Permission } from "@/core/entities/permission.entity";
import {
    CreatePermissionDTO,
    UpdatePermissionDTO,
} from "@/core/application/dtos/requests/permission.request";
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
        const permission = await prisma.permission.findUnique({
            where: { id },
        });

        if (
            permission &&
            tenantId &&
            permission.tenantId !== tenantId &&
            permission.tenantId !== null
        ) {
            return null;
        }
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
        data: CreatePermissionDTO,
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

    async update(
        tenantId: string | undefined,
        id: string,
        data: UpdatePermissionDTO,
    ): Promise<Permission> {
        const existing = await this.findById(tenantId, id);
        if (!existing) throw new EntityNotFoundError("Permission", id);

        try {
            const permission = await prisma.permission.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    active: data.active,
                },
            });
            return this.mapToEntity(permission);
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
        const existing = await this.findById(tenantId, id);
        if (!existing) throw new EntityNotFoundError("Permission", id);

        await prisma.permission.delete({
            where: { id },
        });
    }

    async upsertByName(
        tenantId: string,
        name: string,
        description: string,
    ): Promise<Permission> {
        const existing = await prisma.permission.findFirst({
            where: { name, tenantId },
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
