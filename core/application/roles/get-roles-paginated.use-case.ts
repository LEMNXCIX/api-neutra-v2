import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetRolesPaginatedUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(tenantId: string | undefined, page: number = 1, limit: number = 10, search?: string): Promise<UseCaseResult> {
        const { roles, total } = await this.roleRepository.findAllPaginated(tenantId, page, limit, search);
        const totalPages = Math.ceil(total / limit);

        return Success(roles, "Roles retrieved successfully", {
            pagination: { page, limit, total, totalPages },
        });
    }
}
