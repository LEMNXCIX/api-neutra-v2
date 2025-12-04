import { IRoleRepository } from '@/core/repositories/role.repository.interface';

export class GetRolesUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute() {
        const roles = await this.roleRepository.findAll();
        return {
            success: true,
            code: 200,
            message: 'Roles retrieved successfully',
            data: roles
        };
    }

    async executeById(id: string) {
        const role = await this.roleRepository.findById(id);

        if (!role) {
            return {
                success: false,
                code: 404,
                message: 'Role not found',
                data: null
            };
        }

        return {
            success: true,
            code: 200,
            message: 'Role retrieved successfully',
            data: role
        };
    }
}
