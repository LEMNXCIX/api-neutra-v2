import { prisma } from '@/config/db.config';
import { IUserRepository, FindUserOptions } from '@/core/repositories/user.repository.interface';
import { User, CreateUserDTO } from '@/core/entities/user.entity';

/**
 * Tenant-Aware User Repository
 */
export class PrismaUserRepository implements IUserRepository {
    async findAll(tenantId?: string): Promise<User[]> {
        const where = tenantId ? { tenantId } : {};
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                roleId: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                        level: true
                    }
                },
                profilePic: true,
                phone: true,
                pushToken: true,
                active: true,
                googleId: true,
                facebookId: true,
                twitterId: true,
                githubId: true,
                createdAt: true,
                updatedAt: true,
                tenantId: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
                // password excluded for security
            },
            orderBy: { createdAt: 'desc' }
        });
        return users as any[];
    }

    async findByEmail(tenantId?: string, email?: string, options?: FindUserOptions): Promise<User | null> {
        const where: any = { email };
        if (tenantId) where.tenantId = tenantId;

        const user = await prisma.user.findFirst({
            where,
            include: {
                role: options?.includeRole ? {
                    include: {
                        permissions: options?.includePermissions ? {
                            include: {
                                permission: true
                            }
                        } : false
                    }
                } : false
            }
        });

        if (!user) return null;

        // Transform permissions if included
        if (options?.includePermissions && user.role) {
            const transformedUser = {
                ...user,
                role: {
                    id: user.role.id,
                    name: user.role.name,
                    level: user.role.level,
                    permissions: (user.role as any).permissions?.map((rp: any) => rp.permission) || []
                }
            };
            return transformedUser as any;
        }

        return user as any;
    }

    async findById(tenantId: string | undefined, id: string, options?: FindUserOptions): Promise<User | null> {
        const where: any = { id };
        if (tenantId) where.tenantId = tenantId;

        const user = await prisma.user.findFirst({
            where,
            include: {
                role: options?.includeRole ? {
                    include: {
                        permissions: options?.includePermissions ? {
                            include: {
                                permission: true
                            }
                        } : false
                    }
                } : false
            }
        });

        if (!user) return null;

        // Transform permissions if included
        if (options?.includePermissions && user.role) {
            const transformedUser = {
                ...user,
                role: {
                    id: user.role.id,
                    name: user.role.name,
                    level: user.role.level,
                    permissions: (user.role as any).permissions?.map((rp: any) => rp.permission) || []
                }
            };
            return transformedUser as any;
        }

        return user as any;
    }

    async create(tenantId: string | undefined, data: CreateUserDTO): Promise<User> {
        // Get default USER role if no role specified
        let roleId = data.roleId;
        const targetTenantId = tenantId || (data as any).tenantId;

        if (!targetTenantId) {
            throw new Error('tenantId is required to create a user');
        }

        if (!roleId) {
            // Find 'USER' role: try tenant specific first, then global
            const defaultRole = await prisma.role.findFirst({
                where: {
                    name: 'USER',
                    OR: [
                        { tenantId: targetTenantId },
                        { tenantId: null }
                    ]
                },
                orderBy: { tenantId: 'desc' } // Prefer tenant specific (if UUID) over null
            });
            roleId = defaultRole?.id;
        }

        if (!roleId) {
            throw new Error('Unable to assign role: USER role not found in database');
        }

        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: data.password!,
                roleId: roleId,
                tenantId: targetTenantId, // Assign tenant
                profilePic: data.profilePic,
                phone: data.phone,
                pushToken: data.pushToken,
                googleId: data.googleId,
                facebookId: data.facebookId,
                githubId: data.githubId
            },
            include: {
                role: true
            }
        });
        return user as any;
    }

    async update(tenantId: string | undefined, id: string, data: Partial<User>): Promise<User> {
        const updateData: any = { ...data };

        // Remove nested role object if present, we only want roleId
        if (updateData.role) {
            delete updateData.role;
        }

        const where: any = { id };
        if (tenantId) where.tenantId = tenantId;

        const user = await prisma.user.update({
            where,
            data: updateData,
            include: {
                role: true
            }
        });
        return user as any;
    }

    async findByProvider(tenantId: string | undefined, providerField: string, providerId: string): Promise<User | null> {
        const where: any = { [providerField]: providerId };
        if (tenantId) where.tenantId = tenantId;

        const user = await prisma.user.findFirst({
            where,
            include: {
                role: true
            }
        });
        return user as any;
    }

    async linkProvider(tenantId: string | undefined, email: string, providerField: string, providerId: string, profilePic?: string): Promise<User> {
        const updateData: any = {
            [providerField]: providerId
        };

        if (profilePic) {
            updateData.profilePic = profilePic;
        }

        const where: any = { email };
        if (tenantId) where.tenantId = tenantId;

        const user = await prisma.user.updateMany({
            where,
            data: updateData
        });

        // Fetch updated user since updateMany doesn't return the record
        const updatedUser = await this.findByEmail(tenantId, email, { includeRole: true });
        if (!updatedUser) throw new Error('User not found after update');

        return updatedUser;
    }

    async getUsersStats(tenantId?: string): Promise<{ yearMonth: string; total: number }[]> {
        const tenantFilter = tenantId ? prisma.$queryRaw`AND "tenantId" = ${tenantId}` : prisma.$queryRaw``;

        const result: any[] = await prisma.$queryRaw`
            SELECT to_char("createdAt", 'YYYY-MM') as "yearMonth", COUNT(*)::int as total
            FROM users
            WHERE "createdAt" >= NOW() - INTERVAL '1 year'
            ${tenantFilter}
            GROUP BY "yearMonth"
            ORDER BY "yearMonth" ASC
        `;

        return result.map(r => ({
            yearMonth: r.yearMonth,
            total: r.total
        }));
    }

    async getSummaryStats(tenantId?: string): Promise<{ totalUsers: number; adminUsers: number; regularUsers: number }> {
        const where: any = tenantId ? { tenantId } : {};
        const [totalUsers, adminUsers] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.count({
                where: {
                    ...where,
                    role: {
                        name: { in: ['ADMIN', 'SUPER_ADMIN'] }
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

    async findByRoleId(tenantId: string | undefined, roleId: string): Promise<User[]> {
        const where: any = { roleId };
        if (tenantId) where.tenantId = tenantId;

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                roleId: true,
                role: {
                    select: {
                        id: true,
                        name: true,
                        level: true
                    }
                },
                profilePic: true,
                active: true,
                createdAt: true,
                updatedAt: true
            }
        });
        return users as any[];
    }

    async delete(tenantId: string | undefined, id: string): Promise<void> {
        const where: any = { id };
        if (tenantId) where.tenantId = tenantId;

        await prisma.user.delete({
            where
        });
    }
}
