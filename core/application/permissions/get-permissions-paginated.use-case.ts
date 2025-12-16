import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';

export class GetPermissionsPaginatedUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(page: number = 1, limit: number = 10, search?: string) {
        try {
            const { permissions, total } = await this.permissionRepository.findAllPaginated(page, limit, search);
            const totalPages = Math.ceil(total / limit);

            return {
                success: true,
                code: 200,
                message: "Permissions retrieved successfully",
                data: permissions,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages
                }
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error retrieving permissions",
                errors: error.message || error
            };
        }
    }
}
