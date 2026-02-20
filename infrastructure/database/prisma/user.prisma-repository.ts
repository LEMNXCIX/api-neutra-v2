import { prisma } from '@/config/db.config';
import { IUserRepository, FindUserOptions } from '@/core/repositories/user.repository.interface';
import { User, CreateUserDTO } from '@/core/entities/user.entity';

/**
 * Tenant-Aware User Repository
 */
export class PrismaUserRepository implements IUserRepository {
    async findAll(tenantId?: string): Promise<User[]> {
        const where = tenantId ? {
            OR: [
                { tenants: { some: { tenantId } } },
                { products: { some: { tenantId } } },
                { orders: { some: { tenantId } } }
            ]
        } : {};

        const users = await prisma.user.findMany({
            where,
            include: {
                tenants: {
                    where: tenantId ? { tenantId } : {},
                    include: {
                        tenant: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return users.map(user => this.mapToEntity(user));
    }

    async findByEmail(email: string, options?: FindUserOptions): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                tenants: {
                    include: {
                        role: options?.includeRole ? {
                            include: {
                                permissions: options?.includePermissions ? {
                                    include: {
                                        permission: true
                                    }
                                } : false
                            }
                        } : true,
                        tenant: true
                    }
                }
            }
        });

        if (!user) return null;
        return this.mapToEntity(user);
    }

    async findById(id: string, options?: FindUserOptions): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                tenants: {
                    include: {
                        role: options?.includeRole ? {
                            include: {
                                permissions: options?.includePermissions ? {
                                    include: {
                                        permission: true
                                    }
                                } : false
                            }
                        } : true,
                        tenant: true
                    }
                }
            }
        });

        if (!user) return null;
        return this.mapToEntity(user);
    }

    async create(data: CreateUserDTO): Promise<User> {
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
                active: data.active !== undefined ? data.active : true
            },
            include: {
                tenants: {
                    include: {
                        role: true,
                        tenant: true
                    }
                }
            }
        });
        return this.mapToEntity(user);
    }

    async update(id: string, data: Partial<User>): Promise<User> {
        const { tenants, ...userData } = data as any;
        const user = await prisma.user.update({
            where: { id },
            data: userData,
            include: {
                tenants: {
                    include: {
                        role: true,
                        tenant: true
                    }
                }
            }
        });
        return this.mapToEntity(user);
    }

    async findByProvider(providerField: string, providerId: string): Promise<User | null> {
        const user = await prisma.user.findFirst({
            where: { [providerField]: providerId },
            include: {
                tenants: {
                    include: {
                        role: true,
                        tenant: true
                    }
                }
            }
        });
        return user ? this.mapToEntity(user) : null;
    }

    async linkProvider(email: string, providerField: string, providerId: string, profilePic?: string): Promise<User> {
        const updateData: any = {
            [providerField]: providerId
        };

        if (profilePic) {
            updateData.profilePic = profilePic;
        }

        await prisma.user.update({
            where: { email },
            data: updateData
        });

        const updatedUser = await this.findByEmail(email, { includeRole: true });
        if (!updatedUser) throw new Error('User not found after update');

        return updatedUser;
    }

    async getUsersStats(tenantId?: string): Promise<{ yearMonth: string; total: number }[]> {
        const where = tenantId ? {
            OR: [
                { tenants: { some: { tenantId } } },
                { products: { some: { tenantId } } },
                { orders: { some: { tenantId } } }
            ]
        } : {};

        const users = await prisma.user.findMany({
            where,
            select: { createdAt: true }
        });

        // Group by month manually as queryRaw is tenant-dependent
        const stats: Record<string, number> = {};
        users.forEach(u => {
            const ym = u.createdAt.toISOString().slice(0, 7);
            stats[ym] = (stats[ym] || 0) + 1;
        });

        return Object.entries(stats).map(([yearMonth, total]) => ({ yearMonth, total })).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    }

    async getSummaryStats(tenantId?: string): Promise<{ totalUsers: number; adminUsers: number; regularUsers: number }> {
        const where = tenantId ? {
            OR: [
                { tenants: { some: { tenantId } } },
                { products: { some: { tenantId } } },
                { orders: { some: { tenantId } } }
            ]
        } : {};

        const [totalUsers, adminUsers] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.count({
                where: {
                    ...where,
                    tenants: {
                        some: {
                            ...(tenantId && { tenantId }),
                            role: {
                                name: { in: ['ADMIN', 'SUPER_ADMIN'] }
                            }
                        }
                    }
                }
            })
        ]);

        return {
            totalUsers,
            adminUsers,
            regularUsers: totalUsers - adminUsers
        };
    }

    async findByRoleId(tenantId: string, roleId: string): Promise<User[]> {
        const users = await prisma.user.findMany({
            where: {
                tenants: {
                    some: { tenantId, roleId }
                }
            },
            include: {
                tenants: {
                    where: { tenantId },
                    include: { role: true }
                }
            }
        });
        return users.map(user => this.mapToEntity(user));
    }

    async findByResetToken(token: string): Promise<User | null> {
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: {
                    gt: new Date()
                }
            },
            include: {
                tenants: {
                    include: { role: true, tenant: true }
                }
            }
        });
        return user ? this.mapToEntity(user) : null;
    }

    async delete(id: string): Promise<void> {
        await prisma.user.delete({
            where: { id }
        });
    }

    // Multi-tenant relations
    async addTenant(userId: string, tenantId: string, roleId: string): Promise<void> {
        await prisma.userTenant.upsert({
            where: {
                userId_tenantId: { userId, tenantId }
            },
            update: { roleId },
            create: { userId, tenantId, roleId }
        });
    }

    async removeTenant(userId: string, tenantId: string): Promise<void> {
        await prisma.userTenant.delete({
            where: {
                userId_tenantId: { userId, tenantId }
            }
        });
    }

    async getUserTenants(userId: string): Promise<any[]> {
        return prisma.userTenant.findMany({
            where: { userId },
            include: { role: true, tenant: true }
        });
    }

    private mapToEntity(prismaUser: any): User {
        const { tenants, roles, role: r, ...userData } = prismaUser;

        // Map UserTenants to entity structure
        const mappedTenants = tenants?.map((ut: any) => ({
            id: ut.id,
            userId: ut.userId,
            tenantId: ut.tenantId,
            roleId: ut.roleId,
            role: ut.role ? {
                id: ut.role.id,
                name: ut.role.name,
                level: ut.role.level,
                permissions: ut.role.permissions?.map((rp: any) => rp.permission) || []
            } : undefined,
            tenant: ut.tenant ? {
                id: ut.tenant.id,
                name: ut.tenant.name,
                slug: ut.tenant.slug
            } : undefined
        }));

        // If there's only one tenant mapped (usually because we filtered by it),
        // promote its role and tenant to top level for convenience.
        // Otherwise, if we have multiple, take the first one as a fallback.
        let role = r;
        let tenant = undefined;

        if (mappedTenants && mappedTenants.length > 0) {
            // Priority 1: If only one tenant, use it
            // Priority 2: If we have multiple but current role is still undefined, use the first one
            if (mappedTenants.length === 1 || !role) {
                role = mappedTenants[0].role;
                tenant = mappedTenants[0].tenant;
            }
        }

        return {
            ...userData,
            role,
            tenant,
            tenants: mappedTenants
        };
    }
}
