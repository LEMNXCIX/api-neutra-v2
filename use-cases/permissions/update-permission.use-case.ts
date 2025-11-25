import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { UpdatePermissionDTO } from '@/core/entities/permission.entity';

export class UpdatePermissionUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(id: string, data: UpdatePermissionDTO) {
        const existingPermission = await this.permissionRepository.findById(id);

        if (!existingPermission) {
            return {
                success: false,
                code: 404,
                message: 'Permission not found',
                data: null
            };
        }

        if (data.name) {
            const permissionWithSameName = await this.permissionRepository.findByName(data.name);
            if (permissionWithSameName && permissionWithSameName.id !== id) {
                return {
                    success: false,
                    code: 409,
                    message: 'Permission name already in use',
                    data: null
                };
            }
        }

        const updatedPermission = await this.permissionRepository.update(id, data);

        return {
            success: true,
            code: 200,
            message: 'Permission updated successfully',
            data: updatedPermission
        };
    }
}
