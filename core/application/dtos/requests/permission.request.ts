export interface CreatePermissionDTO {
    name: string;
    description?: string;
    active?: boolean;
}

export interface UpdatePermissionDTO {
    name?: string;
    description?: string;
    active?: boolean;
}
