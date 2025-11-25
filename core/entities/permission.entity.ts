export interface Permission {
    id: string;
    name: string;
    description?: string | null;
    createdAt: Date;
}

export interface CreatePermissionDTO {
    name: string;
    description?: string;
}

export interface UpdatePermissionDTO {
    name?: string;
    description?: string;
}
