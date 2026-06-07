export interface CreateRoleDTO {
    name: string;
    description?: string;
    level?: number;
    active?: boolean;
    permissionIds?: string[];
}

export interface UpdateRoleDTO {
    name?: string;
    description?: string;
    level?: number;
    active?: boolean;
    permissionIds?: string[];
}
