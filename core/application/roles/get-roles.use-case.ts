import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class GetRolesUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(tenantId: string | undefined): Promise<UseCaseResult> {
        const roles = await this.roleRepository.findAll(tenantId);
        return Success(roles, 'Roles retrieved successfully');
    }

    async executeById(tenantId: string | undefined, id: string): Promise<UseCaseResult> {
        const role = await this.roleRepository.findById(tenantId, id);

        if (!role) {
            throw new AppError('Role not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        return Success(role, 'Role retrieved successfully');
    }
}
