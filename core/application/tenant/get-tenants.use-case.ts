import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetTenantsUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private logger: ILogger
    ) { }

    async execute(): Promise<UseCaseResult> {
        const tenants = await this.tenantRepository.findAll();
        return Success(tenants);
    }
}
