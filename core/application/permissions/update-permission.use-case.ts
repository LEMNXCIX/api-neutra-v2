import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { UpdatePermissionDTO } from '@/core/entities/permission.entity';

export class UpdatePermissionUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(tenantId: string | undefined, id: string, data: UpdatePermissionDTO) {
        const existingPermission = await this.permissionRepository.findById(tenantId, id);

        if (!existingPermission) {
            return {
                success: false,
                code: 404,
                message: 'Permission not found',
                data: null
            };
        }

        if (data.name) {
            const permissionWithSameName = await this.permissionRepository.findByName(tenantId, data.name);
            if (permissionWithSameName && permissionWithSameName.id !== id) {
                return {
                    success: false,
                    code: 409,
                    message: 'Permission name already in use',
                    data: null
                };
            }
        }

        const updatedPermission = await this.permissionRepository.update(tenantId, id, data);

        return {
            success: true,
            code: 200,
            message: 'Permission updated successfully',
            data: updatedPermission
        };
    }
}
