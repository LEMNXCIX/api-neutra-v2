import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { UpdatePermissionDTO } from '@/core/entities/permission.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class UpdatePermissionUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(tenantId: string | undefined, id: string, data: UpdatePermissionDTO): Promise<UseCaseResult> {
        const existingPermission = await this.permissionRepository.findById(tenantId, id);

        if (!existingPermission) {
            throw new AppError('Permission not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        if (data.name) {
            const permissionWithSameName = await this.permissionRepository.findByName(tenantId, data.name);
            if (permissionWithSameName && permissionWithSameName.id !== id) {
                throw new AppError('Permission name already in use', 409, ResourceErrorCodes.ALREADY_EXISTS);
            }
        }

        const updatedPermission = await this.permissionRepository.update(tenantId, id, data);

        return Success(updatedPermission, 'Permission updated successfully');
    }
}
