import { Permission, CreatePermissionDTO, UpdatePermissionDTO } from '@/core/entities/permission.entity';

export interface IPermissionRepository {
    findAll(tenantId: string | undefined): Promise<Permission[]>;
    findAllPaginated(tenantId: string | undefined, page: number, limit: number, search?: string): Promise<{ permissions: Permission[]; total: number }>;
    findById(tenantId: string | undefined, id: string): Promise<Permission | null>;
    findByName(tenantId: string | undefined, name: string): Promise<Permission | null>;
    create(tenantId: string | undefined, data: CreatePermissionDTO): Promise<Permission>;
    update(tenantId: string | undefined, id: string, data: UpdatePermissionDTO): Promise<Permission>;
    delete(tenantId: string | undefined, id: string): Promise<void>;
}
