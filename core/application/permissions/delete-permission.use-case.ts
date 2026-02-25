import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class DeletePermissionUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(tenantId: string | undefined, id: string): Promise<UseCaseResult> {
        const existingPermission = await this.permissionRepository.findById(tenantId, id);

        if (!existingPermission) {
            throw new AppError('Permission not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        await this.permissionRepository.delete(tenantId, id);

        return Success(null, 'Permission deleted successfully');
    }
}
