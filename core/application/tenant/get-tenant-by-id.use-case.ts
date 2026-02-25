import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { TenantErrorCodes } from '@/types/error-codes';

export class GetTenantByIdUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private logger: ILogger
    ) { }

    async execute(id: string): Promise<UseCaseResult> {
        const tenant = await this.tenantRepository.findById(id);
        if (!tenant) {
            throw new AppError('Tenant not found', 404, TenantErrorCodes.TENANT_NOT_FOUND);
        }

        return Success(tenant);
    }
}
