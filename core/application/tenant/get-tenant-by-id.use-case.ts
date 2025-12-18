import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class GetTenantByIdUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private logger: ILogger
    ) { }

    async execute(id: string) {
        try {
            const tenant = await this.tenantRepository.findById(id);
            if (!tenant) {
                return {
                    code: 404,
                    success: false,
                    message: 'Tenant not found',
                };
            }

            return {
                code: 200,
                success: true,
                data: tenant,
            };
        } catch (error: any) {
            this.logger.error('Error fetching tenant by ID', error, { tenantId: id });
            return {
                code: 500,
                success: false,
                message: 'Error fetching tenant',
            };
        }
    }
}
