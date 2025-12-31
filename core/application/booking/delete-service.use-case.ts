import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class DeleteServiceUseCase {
    constructor(
        private serviceRepository: IServiceRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, id: string) {
        try {
            const existingService = await this.serviceRepository.findById(tenantId, id);
            if (!existingService) {
                return {
                    success: false,
                    code: 404,
                    message: 'Service not found',
                };
            }

            await this.serviceRepository.delete(tenantId, id);

            this.logger.info('Service deleted successfully', { serviceId: id });

            return {
                success: true,
                code: 200,
                message: 'Service deleted successfully',
            };
        } catch (error: any) {
            this.logger.error('Error deleting service', { serviceId: id, error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error deleting service',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
