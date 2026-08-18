import { Permission } from "@/core/entities/permission.entity";

export interface PermissionCreateData {
    name: string;
    description?: string;
    active?: boolean;
}

export interface PermissionUpdateData {
    name?: string;
    description?: string;
    active?: boolean;
}

export interface IPermissionRepository {
    findAll(tenantId: string | undefined): Promise<Permission[]>;
    findAllPaginated(
        tenantId: string | undefined,
        page: number,
        limit: number,
        search?: string,
    ): Promise<{ permissions: Permission[]; total: number }>;
    findById(
        tenantId: string | undefined,
        id: string,
    ): Promise<Permission | null>;
    findByName(
        tenantId: string | undefined,
        name: string,
    ): Promise<Permission | null>;
    create(
        tenantId: string | undefined,
        data: PermissionCreateData,
    ): Promise<Permission>;
    update(
        tenantId: string | undefined,
        id: string,
        data: PermissionUpdateData,
    ): Promise<Permission>;
    delete(tenantId: string | undefined, id: string): Promise<void>;
    upsertByName(
        tenantId: string,
        name: string,
        description: string,
    ): Promise<Permission>;
}
