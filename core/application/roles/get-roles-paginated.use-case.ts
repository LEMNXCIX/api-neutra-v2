import { IRoleRepository } from '@/core/repositories/role.repository.interface';

export class GetRolesPaginatedUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(tenantId: string | undefined, page: number = 1, limit: number = 10, search?: string) {
        try {
            const { roles, total } = await this.roleRepository.findAllPaginated(tenantId, page, limit, search);
            const totalPages = Math.ceil(total / limit);

            return {
                success: true,
                code: 200,
                message: "Roles retrieved successfully",
                data: roles,
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
                message: "Error retrieving roles",
                errors: error.message || error
            };
        }
    }
}
