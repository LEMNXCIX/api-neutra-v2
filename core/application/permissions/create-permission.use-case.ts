import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { CreatePermissionDTO } from '@/core/entities/permission.entity';

export class CreatePermissionUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(data: CreatePermissionDTO) {
        const existingPermission = await this.permissionRepository.findByName(data.name);

        if (existingPermission) {
            return {
                success: false,
                code: 409,
                message: 'Permission already exists',
                data: null
            };
        }

        const permission = await this.permissionRepository.create(data);

        return {
            success: true,
            code: 201,
            message: 'Permission created successfully',
            data: permission
        };
    }
}
