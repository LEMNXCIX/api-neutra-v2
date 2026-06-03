export interface IPermissionMinimalResponse {
    id: string;
    name: string;
    description?: string | null;
    active: boolean;
}

export class PermissionMinimalResponse {
    static fromEntity(permission: any): IPermissionMinimalResponse {
        return {
            id: permission.id,
            name: permission.name,
            description: permission.description ?? null,
            active: permission.active,
        };
    }
}

export interface IRoleResponse {
    id: string;
    name: string;
    description?: string | null;
    level: number;
    active: boolean;
    permissions?: IPermissionMinimalResponse[];
    createdAt: Date;
    updatedAt: Date;
}

export class RoleResponse {
    static fromEntity(role: any): IRoleResponse {
        return {
            id: role.id,
            name: role.name,
            description: role.description ?? null,
            level: role.level,
            active: role.active,
            permissions: role.permissions?.map((p: any) =>
                PermissionMinimalResponse.fromEntity(p),
            ),
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        };
    }
}
