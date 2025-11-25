import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { UpdateRoleDTO } from '@/core/entities/role.entity';

export class UpdateRoleUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(id: string, data: UpdateRoleDTO) {
        const existingRole = await this.roleRepository.findById(id);

        if (!existingRole) {
            return {
                success: false,
                code: 404,
                message: 'Role not found',
                data: null
            };
        }

        if (data.name) {
            const roleWithSameName = await this.roleRepository.findByName(data.name);
            if (roleWithSameName && roleWithSameName.id !== id) {
                return {
                    success: false,
                    code: 409,
                    message: 'Role name already in use',
                    data: null
                };
            }
        }

        const updatedRole = await this.roleRepository.update(id, data);

        return {
            success: true,
            code: 200,
            message: 'Role updated successfully',
            data: updatedRole
        };
    }
}
