import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';

export class GetPermissionsUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(tenantId: string | undefined) {
        const permissions = await this.permissionRepository.findAll(tenantId);
        return {
            success: true,
            code: 200,
            message: 'Permissions retrieved successfully',
            data: permissions
        };
    }

    async executeById(tenantId: string | undefined, id: string) {
        const permission = await this.permissionRepository.findById(tenantId, id);

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
