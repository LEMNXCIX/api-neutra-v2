import { IRoleRepository } from '@/core/repositories/role.repository.interface';

export class GetRolesUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(tenantId: string | undefined) {
        const roles = await this.roleRepository.findAll(tenantId);
        return {
            success: true,
            code: 200,
            message: 'Roles retrieved successfully',
            data: roles
        };
    }

    async executeById(tenantId: string | undefined, id: string) {
        const role = await this.roleRepository.findById(tenantId, id);

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
