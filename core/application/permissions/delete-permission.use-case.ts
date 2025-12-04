import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';

export class DeletePermissionUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(id: string) {
        const existingPermission = await this.permissionRepository.findById(id);

        if (!existingPermission) {
            return {
                success: false,
                code: 404,
                message: 'Permission not found',
                data: null
            };
        }

        await this.permissionRepository.delete(id);

        return {
            success: true,
            code: 200,
            message: 'Permission deleted successfully',
            data: null
        };
    }
}
