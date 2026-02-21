import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { CreatePermissionDTO } from '@/core/entities/permission.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class CreatePermissionUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(tenantId: string | undefined, data: CreatePermissionDTO): Promise<UseCaseResult> {
        const existingPermission = await this.permissionRepository.findByName(tenantId, data.name);

        if (existingPermission) {
            throw new AppError('Permission already exists', 409, ResourceErrorCodes.ALREADY_EXISTS);
        }

        const permission = await this.permissionRepository.create(tenantId, data);

        return Success(permission, 'Permission created successfully');
    }
}
