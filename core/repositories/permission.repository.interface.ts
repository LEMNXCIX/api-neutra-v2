import { Permission, CreatePermissionDTO, UpdatePermissionDTO } from '../entities/permission.entity';

export interface IPermissionRepository {
    findAll(): Promise<Permission[]>;
    findById(id: string): Promise<Permission | null>;
    findByName(name: string): Promise<Permission | null>;
    create(data: CreatePermissionDTO): Promise<Permission>;
    update(id: string, data: UpdatePermissionDTO): Promise<Permission>;
    delete(id: string): Promise<void>;
}
