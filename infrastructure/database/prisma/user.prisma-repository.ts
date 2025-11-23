import { prisma } from '@/config/db.config';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { User, CreateUserDTO } from '@/core/entities/user.entity';

export class PrismaUserRepository implements IUserRepository {
    async findAll(): Promise<User[]> {
        const users = await prisma.user.findMany({
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
                googleId: true,
                facebookId: true,
                twitterId: true,
                githubId: true,
                createdAt: true,
                updatedAt: true
                // password excluded for security
            },
            orderBy: { createdAt: 'desc' }
        });
        return users as any[];
    }

    async findByEmail(email: string, options?: { includeRole?: boolean; includePermissions?: boolean }): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { email },
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

    async findById(id: string, options?: { includeRole?: boolean; includePermissions?: boolean }): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { id },
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

    async create(data: CreateUserDTO): Promise<User> {
        // Get default USER role if no role specified
        let roleId = data.roleId;

        if (!roleId) {
            const defaultRole = await prisma.role.findUnique({
                where: { name: 'USER' }
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
                profilePic: data.profilePic,
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

    async update(id: string, data: Partial<User>): Promise<User> {
        const updateData: any = { ...data };

        // Remove nested role object if present, we only want roleId
        if (updateData.role) {
            delete updateData.role;
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            include: {
                role: true
            }
        });
        return user as any;
    }

    async findByProvider(providerField: string, providerId: string): Promise<User | null> {
        const user = await prisma.user.findFirst({
            where: {
                [providerField]: providerId
            },
            include: {
                role: true
            }
        });
        return user as any;
    }

    async linkProvider(email: string, providerField: string, providerId: string, profilePic?: string): Promise<User> {
        const updateData: any = {
            [providerField]: providerId
        };

        if (profilePic) {
            updateData.profilePic = profilePic;
        }

        const user = await prisma.user.update({
            where: { email },
            data: updateData,
            include: {
                role: true
            }
        });
        return user as any;
    }

    async getUsersStats(): Promise<{ yearMonth: string; total: number }[]> {
        const result: any[] = await prisma.$queryRaw`
            SELECT to_char("createdAt", 'YYYY-MM') as "yearMonth", COUNT(*)::int as total
            FROM users
            WHERE "createdAt" >= NOW() - INTERVAL '1 year'
            GROUP BY "yearMonth"
            ORDER BY "yearMonth" ASC
        `;

        return result.map(r => ({
            yearMonth: r.yearMonth,
            total: r.total
        }));
    }
}
