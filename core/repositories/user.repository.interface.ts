import { User, CreateUserDTO, UserTenant } from '@/core/entities/user.entity';
import { Role } from '@/types/rbac';

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
 * User Repository Interface - Multi-Tenant
 */
export interface IUserRepository {
    findAll(tenantId?: string): Promise<User[]>;
    findByEmail(email: string, options?: FindUserOptions): Promise<User | null>;
    findById(id: string, options?: FindUserOptions): Promise<User | null>;
    findByProvider(providerField: string, providerId: string): Promise<User | null>;
    create(data: CreateUserDTO): Promise<User>;
    update(id: string, user: Partial<User>): Promise<User>;
    linkProvider(email: string, providerField: string, providerId: string, profilePic?: string): Promise<User>;
    getUsersStats(tenantId?: string): Promise<{ yearMonth: string; total: number }[]>;
    getSummaryStats(tenantId?: string): Promise<{ totalUsers: number; adminUsers: number; regularUsers: number }>;
    findByRoleId(tenantId: string, roleId: string): Promise<User[]>;
    findByResetToken(token: string): Promise<User | null>;
    delete(id: string): Promise<void>;

    // Multi-tenant relations
    addTenant(userId: string, tenantId: string, roleId: string): Promise<void>;
    removeTenant(userId: string, tenantId: string): Promise<void>;
    getUserTenants(userId: string): Promise<UserTenant[]>;
}
