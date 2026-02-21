import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes, AuthErrorCodes } from '@/types/error-codes';

export class DeleteRoleUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(tenantId: string | undefined, id: string): Promise<UseCaseResult> {
        const existingRole = await this.roleRepository.findById(tenantId, id);

        if (!existingRole) {
            throw new AppError('Role not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        if (['ADMIN', 'USER', 'MANAGER'].includes(existingRole.name)) {
            if (existingRole.name === 'ADMIN' || existingRole.name === 'USER') {
                throw new AppError('Cannot delete system roles', 403, AuthErrorCodes.FORBIDDEN);
            }
        }

        await this.roleRepository.delete(tenantId, id);

        return Success(null, 'Role deleted successfully');
    }
}
