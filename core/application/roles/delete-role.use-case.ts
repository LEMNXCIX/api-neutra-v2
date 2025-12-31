import { IRoleRepository } from '@/core/repositories/role.repository.interface';

export class DeleteRoleUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(tenantId: string | undefined, id: string) {
        const existingRole = await this.roleRepository.findById(tenantId, id);

        if (!existingRole) {
            return {
                success: false,
                code: 404,
                message: 'Role not found',
                data: null
            };
        }

        // Prevent deleting critical roles (optional but recommended)
        if (['ADMIN', 'USER', 'MANAGER'].includes(existingRole.name)) {
            // For now, let's allow it but maybe warn? Or block system roles.
            // Let's block 'ADMIN' and 'USER' deletion for safety.
            if (existingRole.name === 'ADMIN' || existingRole.name === 'USER') {
                return {
                    success: false,
                    code: 403,
                    message: 'Cannot delete system roles',
                    data: null
                };
            }
        }

        await this.roleRepository.delete(tenantId, id);

        return {
            success: true,
            code: 200,
            message: 'Role deleted successfully',
            data: null
        };
    }
}
