import { Role } from "@/core/entities/role.entity";

export interface RoleCreateData {
    name: string;
    description?: string;
    level?: number;
    active?: boolean;
    permissionIds?: string[];
}

export interface RoleUpdateData {
    name?: string;
    description?: string;
    level?: number;
    active?: boolean;
    permissionIds?: string[];
}

export interface IRoleRepository {
    findAll(tenantId: string | undefined): Promise<Role[]>;
    findAllPaginated(
        tenantId: string | undefined,
        page: number,
        limit: number,
        search?: string,
    ): Promise<{ roles: Role[]; total: number }>;
    findById(tenantId: string | undefined, id: string): Promise<Role | null>;
    findByName(
        tenantId: string | undefined,
        name: string,
    ): Promise<Role | null>;
    create(tenantId: string | undefined, data: RoleCreateData): Promise<Role>;
    update(
        tenantId: string | undefined,
        id: string,
        data: RoleUpdateData,
    ): Promise<Role>;
    delete(tenantId: string | undefined, id: string): Promise<void>;
    createWithPermissions(
        tenantId: string,
        data: {
            name: string;
            level: number;
            description: string;
            permissionIds: string[];
        },
    ): Promise<Role>;
    assignPermission(roleId: string, permissionId: string): Promise<void>;
}
