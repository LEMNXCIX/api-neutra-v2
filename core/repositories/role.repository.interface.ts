import { Role, CreateRoleDTO, UpdateRoleDTO } from '@/core/entities/role.entity';

export interface IRoleRepository {
    findAll(tenantId: string | undefined): Promise<Role[]>;
    findAllPaginated(tenantId: string | undefined, page: number, limit: number, search?: string): Promise<{ roles: Role[]; total: number }>;
    findById(tenantId: string | undefined, id: string): Promise<Role | null>;
    findByName(tenantId: string | undefined, name: string): Promise<Role | null>;
    create(tenantId: string | undefined, data: CreateRoleDTO): Promise<Role>;
    update(tenantId: string | undefined, id: string, data: UpdateRoleDTO): Promise<Role>;
    delete(tenantId: string | undefined, id: string): Promise<void>;
}
