import { Permission } from '@/core/entities/permission.entity';

export interface Role {
    id: string;
    name: string;
    description?: string | null;
    level: number;
    permissions?: Permission[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateRoleDTO {
    name: string;
    description?: string;
    level?: number;
    permissionIds?: string[];
}

export interface UpdateRoleDTO {
    name?: string;
    description?: string;
    level?: number;
    permissionIds?: string[];
}
