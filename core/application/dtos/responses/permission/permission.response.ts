import { Permission } from "@/core/entities/permission.entity";

export interface IPermissionResponse {
    id: string;
    name: string;
    description?: string | null;
    active: boolean;
    createdAt: Date;
}

export class PermissionResponse {
    static fromEntity(permission: Permission): IPermissionResponse {
        return {
            id: permission.id,
            name: permission.name,
            description: permission.description ?? null,
            active: permission.active,
            createdAt: permission.createdAt,
        };
    }
}
