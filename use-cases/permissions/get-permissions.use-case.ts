import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';

export class GetPermissionsUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute() {
        const permissions = await this.permissionRepository.findAll();
        return {
            success: true,
            code: 200,
            message: 'Permissions retrieved successfully',
            data: permissions
        };
    }

    async executeById(id: string) {
        const permission = await this.permissionRepository.findById(id);

        if (!permission) {
            return {
                success: false,
                code: 404,
                message: 'Permission not found',
                data: null
            };
        }

        return {
            success: true,
            code: 200,
            message: 'Permission retrieved successfully',
            data: permission
        };
    }
}
