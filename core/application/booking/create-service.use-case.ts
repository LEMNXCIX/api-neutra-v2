import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { CreateServiceDTO } from '@/core/entities/service.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { ValidationErrorCodes, ResourceErrorCodes } from '@/types/error-codes';

export class CreateServiceUseCase {
    constructor(
        private serviceRepository: IServiceRepository,
        private categoryRepository: ICategoryRepository,
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

        if (data.categoryId) {
            try {
                const category = await this.categoryRepository.findById(tenantId, data.categoryId);
                if (!category) {
                    this.logger.warn('CreateService failed: category not found or does not belong to tenant', { tenantId, categoryId: data.categoryId });
                    return {
                        success: false,
                        code: 400,
                        message: 'Invalid category',
                        errors: [{
                            code: ResourceErrorCodes.NOT_FOUND,
                            message: 'Category not found or does not belong to your account',
                        }],
                    };
                }
            } catch (error) {
                // repository should handle errors, but just in case
            }
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
