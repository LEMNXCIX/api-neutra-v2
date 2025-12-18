import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { CreateServiceDTO } from '@/core/entities/service.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { ValidationErrorCodes } from '@/types/error-codes';

export class CreateServiceUseCase {
    constructor(
        private serviceRepository: IServiceRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, data: CreateServiceDTO) {
        // Validation
        if (!data.name || !data.duration || data.price === undefined) {
            this.logger.warn('CreateService failed: missing required fields', { data });
            return {
                success: false,
                code: 400,
                message: 'Missing required fields',
                errors: [{
                    code: ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
                    message: 'Name, duration, and price are required',
                }],
            };
        }

        if (data.duration <= 0) {
            return {
                success: false,
                code: 400,
                message: 'Duration must be positive',
                errors: [{
                    code: ValidationErrorCodes.INVALID_DATA_TYPE,
                    message: 'Duration must be greater than 0',
                }],
            };
        }

        try {
            const service = await this.serviceRepository.create(tenantId, data);

            this.logger.info('Service created successfully', { serviceId: service.id });

            return {
                success: true,
                code: 201,
                message: 'Service created successfully',
                data: service,
            };
        } catch (error: any) {
            this.logger.error('Error creating service', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error creating service',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
