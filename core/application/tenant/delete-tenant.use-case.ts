import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { TenantErrorCodes } from '@/types/error-codes';

export class DeleteTenantUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private logger: ILogger
    ) { }

    async execute(id: string): Promise<UseCaseResult> {
        const tenant = await this.tenantRepository.findById(id);
        if (!tenant) {
            throw new AppError(`Tenant with ID ${id} not found`, 404, TenantErrorCodes.TENANT_NOT_FOUND);
        }

        await this.tenantRepository.delete(id);
        this.logger.info(`Tenant deleted: ${id}`);

        return Success(null, 'Tenant deleted successfully');
    }
}
