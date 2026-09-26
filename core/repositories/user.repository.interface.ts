import { User, UserTenant } from "@/core/entities/user.entity";

export interface UserCreateData {
    name: string;
    email: string;
    password?: string;
    profilePic?: string;
    phone?: string;
    pushToken?: string;
    active?: boolean;
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
    findByProvider(
        providerField: string,
        providerId: string,
    ): Promise<User | null>;
    create(data: UserCreateData): Promise<User>;
    linkProvider(
        email: string,
        providerField: string,
        providerId: string,
        profilePic?: string,
    ): Promise<User>;
    getUsersStats(
        tenantId?: string,
    ): Promise<{ yearMonth: string; total: number }[]>;
    getSummaryStats(tenantId?: string): Promise<{
        totalUsers: number;
        adminUsers: number;
        regularUsers: number;
    }>;
    findByRoleId(tenantId: string, roleId: string): Promise<User[]>;
    findByResetToken(token: string): Promise<User | null>;

    /**
     * Global read, global update and global delete, with no tenant in the
     * predicate. They stay because the auth flows (login, register, social
     * login, token resolution, password reset) must reach a user before or
     * outside any tenant — a user belongs to several tenants through
     * `UserTenant`, so a global lookup is the only way to resolve the identity
     * first.
     *
     * Any caller acting on behalf of a tenant must use the tenant-scoped
     * members below instead: with `users:manage` in tenant A, the global write
     * pair rewrites the name, email, password or active flag of a customer who
     * belongs only to tenant B, and the global delete cascades away that
     * customer's rows in every other tenant.
     */
    update(id: string, user: Partial<User>): Promise<User>;
    delete(id: string): Promise<void>;

    // Tenant-scoped read/write/delete: membership is part of the query, so the
    // database decides whether the acting tenant can see or act on the user.
    findByIdForTenant(
        tenantId: string,
        id: string,
        options?: FindUserOptions,
    ): Promise<User | null>;
    updateForTenant(
        tenantId: string,
        id: string,
        user: Partial<User>,
    ): Promise<User>;
    deleteForTenant(tenantId: string, id: string): Promise<void>;

    // Multi-tenant relations
    addTenant(userId: string, tenantId: string, roleId: string): Promise<void>;
    removeTenant(userId: string, tenantId: string): Promise<void>;
    getUserTenants(userId: string): Promise<UserTenant[]>;
}
