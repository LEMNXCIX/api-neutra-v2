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
            /**
             * Optional, like `RoleCreateData`/`RoleUpdateData` rather than
             * required as it was: `createWithPermissions` was the one write
             * that declared it mandatory, so a caller that had no permission
             * list to pass had to invent an empty one, and the repository had
             * to `map` a value that could be absent. `create-tenant.use-case`
             * is the only caller and already computes an array.
             */
            permissionIds?: string[];
        },
    ): Promise<Role>;
    /**
     * Tenant first, like every other write on this port — including the three
     * that reach `role_permissions`. The previous `(roleId, permissionId)`
     * shape carried no tenant, so there was nothing to scope the permission
     * against and the write was unguarded. No caller existed, so nothing
     * depended on the old order.
     */
    assignPermission(
        tenantId: string | undefined,
        roleId: string,
        permissionId: string,
    ): Promise<void>;
}
