import { Role } from "@/core/entities/role.entity";

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    profilePic: string | null;
    phone: string | null;
    pushToken: string | null;
    active: boolean;
    googleId: string | null;
    facebookId: string | null;
    twitterId: string | null;
    githubId: string | null;

    // Multi-tenancy
    tenants?: UserTenant[];
    tenant?: {
        id: string;
        name: string;
        slug: string;
    };
    role?: Role;

    resetPasswordToken: string | null;
    resetPasswordExpires: Date | null;
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
