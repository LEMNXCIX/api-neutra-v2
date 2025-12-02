export interface Permission {
    id: string;
    name: string;
    description?: string | null;
    active: boolean;
    createdAt: Date;
}

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
