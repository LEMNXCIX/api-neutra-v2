import { Role, CreateRoleDTO, UpdateRoleDTO } from '../entities/role.entity';

export interface IRoleRepository {
    findAll(): Promise<Role[]>;
    findById(id: string): Promise<Role | null>;
    findByName(name: string): Promise<Role | null>;
    create(data: CreateRoleDTO): Promise<Role>;
    update(id: string, data: UpdateRoleDTO): Promise<Role>;
    delete(id: string): Promise<void>;
}
