// RBAC Type Definitions

// Permission format: "resource:action"
export type PermissionAction = 'read' | 'write' | 'delete' | 'manage';

export type PermissionResource =
    | 'users'
    | 'products'
    | 'orders'
    | 'cart'
    | 'slides'
    | 'stats';

export type PermissionString = `${PermissionResource}:${PermissionAction}`;

export interface Permission {
    id: string;
    name: PermissionString;
    description?: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    level: number;
    permissions: Permission[];
}

export interface JWTPayload {
    id: string;
    email: string;
    name: string;
    role: {
        id: string;
        name: string;
        level: number;
    };
}

export interface AuthenticatedUser extends JWTPayload {
    role: {
        id: string;
        name: string;
        level: number;
        permissions: string[];
    };
}

// Helper type for user entities with role information
export interface UserWithRole {
    id: string;
    name: string;
    email: string;
    roleId: string;
    role: Role;
    profilePic?: string;
    createdAt: Date;
    updatedAt: Date;
}
