
import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class GetTenantsUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private logger: ILogger
    ) { }

    async execute() {
        try {
            // Can add filtering/pagination later
            const tenants = await this.tenantRepository.findAll();
            return {
                code: 200,
                success: true,
                data: tenants,
            };
        } catch (error: any) {
            return {
                code: 500,
                success: false,
                message: 'Error fetching tenants',
            };
        }
    }
}
