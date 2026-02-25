import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetPermissionsPaginatedUseCase {
    constructor(private permissionRepository: IPermissionRepository) { }

    async execute(tenantId: string | undefined, page: number = 1, limit: number = 10, search?: string): Promise<UseCaseResult> {
        const { permissions, total } = await this.permissionRepository.findAllPaginated(tenantId, page, limit, search);
        return Success(permissions, "Permissions retrieved successfully");
    }
}
