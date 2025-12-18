import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class GetServicesUseCase {
    constructor(
        private serviceRepository: IServiceRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, activeOnly: boolean = true) {
        try {
            const services = await this.serviceRepository.findAll(tenantId, activeOnly);

            this.logger.info('Services retrieved successfully', { count: services.length });

            return {
                success: true,
                code: 200,
                message: 'Services retrieved successfully',
                data: services,
            };
        } catch (error: any) {
            this.logger.error('Error retrieving services', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error retrieving services',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
