import { Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import {
    IUserRepository,
    FindUserOptions,
} from "@/core/repositories/user.repository.interface";
import { User, UserTenant } from "@/core/entities/user.entity";
import { Role } from "@/core/entities/role.entity";
import { Permission } from "@/core/entities/permission.entity";
import { CreateUserDTO } from "@/core/application/dtos/requests/user.request";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

interface PrismaTenantRelation {
    id: string;
    userId: string;
    tenantId: string;
    roleId: string;
    role?: {
        id: string;
        name: string;
        level: number;
        description?: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        permissions?: { permission: Permission }[];
    };
    tenant?: { id: string; name: string; slug: string };
}

interface PrismaUserBase {
    id: string;
    name: string;
    email: string;
    password: string;
    profilePic: string | null;
    phone: string | null;
    pushToken: string | null;
    active: boolean;
    googleId: string | null;
    facebookId: string | null;
    twitterId: string | null;
    githubId: string | null;
    resetPasswordToken: string | null;
    resetPasswordExpires: Date | null;
    createdAt: Date;
    updatedAt: Date;
    tenants: PrismaTenantRelation[];
}

export class PrismaUserRepository implements IUserRepository {
    private mapRoleFromPrisma(prismaRole: {
        id: string;
        name: string;
        level: number;
        active: boolean;
        description?: string | null;
        createdAt: Date;
        updatedAt: Date;
        permissions?: { permission: Permission }[];
    }): Role {
        return {
            id: prismaRole.id,
            name: prismaRole.name,
            level: prismaRole.level,
            active: prismaRole.active,
            description: prismaRole.description,
            permissions:
                prismaRole.permissions?.map((rp) => rp.permission) || [],
            createdAt: prismaRole.createdAt,
            updatedAt: prismaRole.updatedAt,
        };
    }

    private mapTenantRelation(ut: PrismaTenantRelation): UserTenant {
        return {
            id: ut.id,
            userId: ut.userId,
            tenantId: ut.tenantId,
            roleId: ut.roleId,
            role: ut.role ? this.mapRoleFromPrisma(ut.role) : undefined,
            tenant: ut.tenant
                ? {
                      id: ut.tenant.id,
                      name: ut.tenant.name,
                      slug: ut.tenant.slug,
                  }
                : undefined,
        };
    }

    private mapToEntity(prismaUser: PrismaUserBase): User {
        const mappedTenants = prismaUser.tenants?.map((ut) =>
            this.mapTenantRelation(ut),
        );

        let role: Role | undefined;
        let tenant: UserTenant["tenant"];

        if (mappedTenants && mappedTenants.length > 0) {
            if (mappedTenants.length === 1 || !role) {
                role = mappedTenants[0].role;
                tenant = mappedTenants[0].tenant;
            }
        }

        return {
            id: prismaUser.id,
            name: prismaUser.name,
            email: prismaUser.email,
            password: prismaUser.password,
            profilePic: prismaUser.profilePic ?? undefined,
            phone: prismaUser.phone ?? undefined,
            pushToken: prismaUser.pushToken ?? undefined,
            active: prismaUser.active,
            googleId: prismaUser.googleId ?? undefined,
            facebookId: prismaUser.facebookId ?? undefined,
            twitterId: prismaUser.twitterId ?? undefined,
            githubId: prismaUser.githubId ?? undefined,
            resetPasswordToken: prismaUser.resetPasswordToken ?? undefined,
            resetPasswordExpires: prismaUser.resetPasswordExpires ?? undefined,
            createdAt: prismaUser.createdAt,
            updatedAt: prismaUser.updatedAt,
            role,
            tenant,
            tenants: mappedTenants,
        };
    }

    async findAll(tenantId?: string): Promise<User[]> {
        const where = tenantId
            ? {
                  OR: [
                      { tenants: { some: { tenantId } } },
                      { products: { some: { tenantId } } },
                      { orders: { some: { tenantId } } },
                  ],
              }
            : {};

        const users = await prisma.user.findMany({
            where,
            include: {
                tenants: {
                    where: tenantId ? { tenantId } : {},
                    include: {
                        tenant: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return users.map((user) => this.mapToEntity(user));
    }

    async findByEmail(
        email: string,
        options?: FindUserOptions,
    ): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                tenants: {
                    include: {
                        role: options?.includeRole
                            ? {
                                  include: {
                                      permissions: options?.includePermissions
                                          ? {
                                                include: {
                                                    permission: true,
                                                },
                                            }
                                          : false,
                                  },
                              }
                            : true,
                        tenant: true,
                    },
                },
            },
        });

        if (!user) return null;
        return this.mapToEntity(user);
    }

    async findById(
        id: string,
        options?: FindUserOptions,
    ): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                tenants: {
                    include: {
                        role: options?.includeRole
                            ? {
                                  include: {
                                      permissions: options?.includePermissions
                                          ? {
                                                include: {
                                                    permission: true,
                                                },
                                            }
                                          : false,
                                  },
                              }
                            : true,
                        tenant: true,
                    },
                },
            },
        });

        if (!user) return null;
        return this.mapToEntity(user);
    }

    async create(data: CreateUserDTO): Promise<User> {
        try {
            const user = await prisma.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    password: data.password!,
                    profilePic: data.profilePic,
                    phone: data.phone,
                    pushToken: data.pushToken,
                    googleId: data.googleId,
                    facebookId: data.facebookId,
                    githubId: data.githubId,
                    active: data.active !== undefined ? data.active : true,
                },
                include: {
                    tenants: {
                        include: {
                            role: true,
                            tenant: true,
                        },
                    },
                },
            });
            return this.mapToEntity(user);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "email";
                throw new DuplicateEntityError("User", target, data.email);
            }
            throw error;
        }
    }

    async update(id: string, data: Partial<User>): Promise<User> {
        const updateData: Prisma.UserUpdateInput = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.password !== undefined) updateData.password = data.password;
        if (data.profilePic !== undefined)
            updateData.profilePic = data.profilePic;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.pushToken !== undefined) updateData.pushToken = data.pushToken;
        if (data.active !== undefined) updateData.active = data.active;
        if (data.googleId !== undefined) updateData.googleId = data.googleId;
        if (data.facebookId !== undefined)
            updateData.facebookId = data.facebookId;
        if (data.githubId !== undefined) updateData.githubId = data.githubId;
        if (data.resetPasswordToken !== undefined)
            updateData.resetPasswordToken = data.resetPasswordToken;
        if (data.resetPasswordExpires !== undefined)
            updateData.resetPasswordExpires = data.resetPasswordExpires;

        try {
            const user = await prisma.user.update({
                where: { id },
                data: updateData,
                include: {
                    tenants: {
                        include: {
                            role: true,
                            tenant: true,
                        },
                    },
                },
            });
            return this.mapToEntity(user);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("User", id);
            }
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "email";
                throw new DuplicateEntityError(
                    "User",
                    target,
                    data.email ?? "",
                );
            }
            throw error;
        }
    }

    async findByProvider(
        providerField: string,
        providerId: string,
    ): Promise<User | null> {
        const user = await prisma.user.findFirst({
            where: { [providerField]: providerId } as Prisma.UserWhereInput,
            include: {
                tenants: {
                    include: {
                        role: true,
                        tenant: true,
                    },
                },
            },
        });
        return user ? this.mapToEntity(user) : null;
    }

    async linkProvider(
        email: string,
        providerField: string,
        providerId: string,
        profilePic?: string,
    ): Promise<User> {
        const updateData: Prisma.UserUpdateInput = {
            [providerField]: providerId,
        } as Prisma.UserUpdateInput;

        if (profilePic) {
            updateData.profilePic = profilePic;
        }

        await prisma.user.update({
            where: { email },
            data: updateData,
        });

        const updatedUser = await this.findByEmail(email, {
            includeRole: true,
        });
        if (!updatedUser) throw new EntityNotFoundError("User", email);

        return updatedUser;
    }

    async getUsersStats(
        tenantId?: string,
    ): Promise<{ yearMonth: string; total: number }[]> {
        const where = tenantId
            ? {
                  OR: [
                      { tenants: { some: { tenantId } } },
                      { products: { some: { tenantId } } },
                      { orders: { some: { tenantId } } },
                  ],
              }
            : {};

        const users = await prisma.user.findMany({
            where,
            select: { createdAt: true },
        });

        const stats: Record<string, number> = {};
        users.forEach((u) => {
            const ym = u.createdAt.toISOString().slice(0, 7);
            stats[ym] = (stats[ym] || 0) + 1;
        });

        return Object.entries(stats)
            .map(([yearMonth, total]) => ({ yearMonth, total }))
            .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    }

    async getSummaryStats(tenantId?: string): Promise<{
        totalUsers: number;
        adminUsers: number;
        regularUsers: number;
    }> {
        const where = tenantId
            ? {
                  OR: [
                      { tenants: { some: { tenantId } } },
                      { products: { some: { tenantId } } },
                      { orders: { some: { tenantId } } },
                  ],
              }
            : {};

        const [totalUsers, adminUsers] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.count({
                where: {
                    ...where,
                    tenants: {
                        some: {
                            ...(tenantId && { tenantId }),
                            role: {
                                name: { in: ["ADMIN", "SUPER_ADMIN"] },
                            },
                        },
                    },
                },
            }),
        ]);

        return {
            totalUsers,
            adminUsers,
            regularUsers: totalUsers - adminUsers,
        };
    }

    async findByRoleId(tenantId: string, roleId: string): Promise<User[]> {
        const users = await prisma.user.findMany({
            where: {
                tenants: {
                    some: { tenantId, roleId },
                },
            },
            include: {
                tenants: {
                    where: { tenantId },
                    include: { role: true },
                },
            },
        });
        return users.map((user) => this.mapToEntity(user));
    }

    async findByResetToken(token: string): Promise<User | null> {
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: {
                    gt: new Date(),
                },
            },
            include: {
                tenants: {
                    include: { role: true, tenant: true },
                },
            },
        });
        return user ? this.mapToEntity(user) : null;
    }

    async delete(id: string): Promise<void> {
        await prisma.user.delete({
            where: { id },
        });
    }

    async addTenant(
        userId: string,
        tenantId: string,
        roleId: string,
    ): Promise<void> {
        await prisma.userTenant.upsert({
            where: {
                userId_tenantId: { userId, tenantId },
            },
            update: { roleId },
            create: { userId, tenantId, roleId },
        });
    }

    async removeTenant(userId: string, tenantId: string): Promise<void> {
        await prisma.userTenant.delete({
            where: {
                userId_tenantId: { userId, tenantId },
            },
        });
    }

    async getUserTenants(userId: string): Promise<UserTenant[]> {
        const userTenants = await prisma.userTenant.findMany({
            where: { userId },
            include: { role: true, tenant: true },
        });
        return userTenants.map((ut) =>
            this.mapTenantRelation(ut as PrismaTenantRelation),
        );
    }
}
