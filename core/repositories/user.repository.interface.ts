import { User, CreateUserDTO } from '@/core/entities/user.entity';

export interface UpdateUserDTO {
    name?: string;
    email?: string;
    password?: string;
    roleId?: string;
    profilePic?: string;
    googleId?: string;
    facebookId?: string;
    twitterId?: string;
    githubId?: string;
}

export interface FindUserOptions {
    includeRole?: boolean;
    includePermissions?: boolean;
}

/**
 * User Repository Interface - Tenant-Scoped
 */
export interface IUserRepository {
    findAll(tenantId?: string): Promise<User[]>;
    findByEmail(tenantId: string | undefined, email: string, options?: FindUserOptions): Promise<User | null>;
    findById(tenantId: string | undefined, id: string, options?: FindUserOptions): Promise<User | null>;
    findByProvider(tenantId: string | undefined, providerField: string, providerId: string): Promise<User | null>;
    create(tenantId: string | undefined, user: CreateUserDTO): Promise<User>;
    update(tenantId: string | undefined, id: string, user: Partial<User>): Promise<User>;
    linkProvider(tenantId: string | undefined, email: string, providerField: string, providerId: string, profilePic?: string): Promise<User>;
    getUsersStats(tenantId?: string): Promise<{ yearMonth: string; total: number }[]>;
    getSummaryStats(tenantId?: string): Promise<{ totalUsers: number; adminUsers: number; regularUsers: number }>;
    findByRoleId(tenantId: string | undefined, roleId: string): Promise<User[]>;
    findByResetToken(token: string): Promise<User | null>;
    delete(tenantId: string | undefined, id: string): Promise<void>;
}
