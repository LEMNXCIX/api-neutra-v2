import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { CreateRoleDTO } from '@/core/entities/role.entity';

export class CreateRoleUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(data: CreateRoleDTO) {
        const existingRole = await this.roleRepository.findByName(data.name);

        if (existingRole) {
            return {
                success: false,
                code: 409,
                message: 'Role already exists',
                data: null
            };
        }

        const role = await this.roleRepository.create(data);

        return {
            success: true,
            code: 201,
            message: 'Role created successfully',
            data: role
        };
    }
}
