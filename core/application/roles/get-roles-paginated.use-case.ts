import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetRolesPaginatedUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(tenantId: string | undefined, page: number = 1, limit: number = 10, search?: string): Promise<UseCaseResult> {
        const { roles, total } = await this.roleRepository.findAllPaginated(tenantId, page, limit, search);
        const totalPages = Math.ceil(total / limit);

        return Success(roles, "Roles retrieved successfully");
        // Note: Pagination data should ideally be part of UseCaseResult or a specific property
        // For now Success(roles) is enough if pagination is handled in meta or data
    }
}
