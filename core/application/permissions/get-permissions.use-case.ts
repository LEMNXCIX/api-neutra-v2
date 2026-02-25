import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class GetPermissionsUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(tenantId: string | undefined): Promise<UseCaseResult> {
        const permissions = await this.permissionRepository.findAll(tenantId);
        return Success(permissions, 'Permissions retrieved successfully');
    }

    async executeById(tenantId: string | undefined, id: string): Promise<UseCaseResult> {
        const permission = await this.permissionRepository.findById(tenantId, id);

        if (!permission) {
            throw new AppError('Permission not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        return Success(permission, 'Permission retrieved successfully');
    }
}
