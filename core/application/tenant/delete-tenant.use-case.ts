
import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class DeleteTenantUseCase {
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
                    message: `Tenant with ID ${id} not found`,
                };
            }

            await this.tenantRepository.delete(id);
            this.logger.info(`Tenant deleted: ${id}`);

            return {
                code: 200,
                success: true,
                message: 'Tenant deleted successfully',
            };
        } catch (error: any) {
            this.logger.error(`Error deleting tenant ${id}: ${error.message}`);
            return {
                code: 500,
                success: false,
                message: 'Error deleting tenant',
            };
        }
    }
}
