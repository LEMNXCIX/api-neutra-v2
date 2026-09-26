import { Role } from "@/core/entities/role.entity";

export interface User {
    id: string;
    name: string;
    email: string;
    // Non-nullable in the schema: `password String`. It was optional here, which
    // let every reader treat a missing password as possible.
    password: string;
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
    // `DateTime @default(now())` and `@updatedAt` in the schema, so a stored
    // user always carries both.
    createdAt: Date;
    updatedAt: Date;
}

export interface UserTenant {
    id: string;
    userId: string;
    tenantId: string;
    roleId: string;
    role?: Role;
    tenant?: {
        id: string;
        name: string;
        slug: string;
    };
}
