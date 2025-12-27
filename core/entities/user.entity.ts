import { Role } from '@/types/rbac';

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    roleId: string;
    role?: Role;  // Optional, populated when needed
    profilePic?: string;
    phone?: string;
    pushToken?: string;
    active: boolean;
    googleId?: string;
    facebookId?: string;
    twitterId?: string;
    githubId?: string;
    tenantId: string;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateUserDTO {
    name: string;
    email: string;
    password?: string;
    roleId?: string;  // Optional, defaults to USER role if not provided
    profilePic?: string;
    phone?: string;
    pushToken?: string;
    active?: boolean;
    googleId?: string;
    facebookId?: string;
    twitterId?: string;
    githubId?: string;
}
