import { Role, CreateRoleDTO, UpdateRoleDTO } from '@/core/entities/role.entity';

export interface IRoleRepository {
    findAll(): Promise<Role[]>;
    findAllPaginated(page: number, limit: number, search?: string): Promise<{ roles: Role[]; total: number }>;
    findById(id: string): Promise<Role | null>;
    findByName(name: string): Promise<Role | null>;
    create(data: CreateRoleDTO): Promise<Role>;
    update(id: string, data: UpdateRoleDTO): Promise<Role>;
    delete(id: string): Promise<void>;
}
