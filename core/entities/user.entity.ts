import { Role } from "@/core/entities/role.entity";

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    profilePic?: string;
    phone?: string;
    pushToken?: string;
    active: boolean;
    googleId?: string;
    facebookId?: string;
    twitterId?: string;
    githubId?: string;

    // Multi-tenancy
    tenants?: UserTenant[];
    tenant?: {
        id: string;
        name: string;
        slug: string;
    };
    role?: Role;

    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface UserTenant {
    id: string;
    userId: string;
    tenantId: string;
    roleId: string;
    role?: Role;
    tenantId_userId?: string;
    tenant?: {
        id: string;
        name: string;
        slug: string;
    };
}
