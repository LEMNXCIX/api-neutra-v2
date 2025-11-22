import { prisma } from '@/config/db.config';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { User, CreateUserDTO } from '@/core/entities/user.entity';
import { Role } from '@prisma/client';

export class PrismaUserRepository implements IUserRepository {
    async findAll(): Promise<User[]> {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
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
        return users as User[];
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { email }
        });
        return user as User | null;
    }

    async findById(id: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { id }
        });
        return user as User | null;
    }

    async create(data: CreateUserDTO): Promise<User> {
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: data.password!, // We assume password is hashed and present for local auth, or handled otherwise
                role: data.role as Role || 'USER',
                profilePic: data.profilePic,
                googleId: data.googleId,
                facebookId: data.facebookId,
                githubId: data.githubId
            }
        });
        return user as User;
    }

    async update(id: string, data: Partial<User>): Promise<User> {
        const user = await prisma.user.update({
            where: { id },
            data: {
                ...data,
                role: data.role ? (data.role as Role) : undefined
            }
        });
        return user as User;
    }

    async findByProvider(providerField: string, providerId: string): Promise<User | null> {
        const user = await prisma.user.findFirst({
            where: {
                [providerField]: providerId
            }
        });
        return user as User | null;
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
            data: updateData
        });
        return user as User;
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
