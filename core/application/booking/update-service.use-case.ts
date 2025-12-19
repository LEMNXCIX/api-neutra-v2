import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { UpdateServiceDTO } from '@/core/entities/service.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { ValidationErrorCodes, ResourceErrorCodes } from '@/types/error-codes';

export class UpdateServiceUseCase {
    constructor(
        private serviceRepository: IServiceRepository,
        private categoryRepository: ICategoryRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, id: string, data: UpdateServiceDTO) {
        if (data.name === '') {
            this.logger.warn('UpdateService failed: empty name', { id, data });
            return {
                success: false,
                code: 400,
                message: 'Name cannot be empty',
                errors: [{
                    code: ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
                    message: 'Service name is required',
                }],
            };
        }

        try {
            const existingService = await this.serviceRepository.findById(tenantId, id);
            if (!existingService) {
                return {
                    success: false,
                    code: 404,
                    message: 'Service not found',
                };
            }

            if (data.categoryId) {
                const category = await this.categoryRepository.findById(tenantId, data.categoryId);
                if (!category) {
                    this.logger.warn('UpdateService failed: category not found or does not belong to tenant', { tenantId, id, categoryId: data.categoryId });
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
            }

            const service = await this.serviceRepository.update(tenantId, id, data);

            this.logger.info('Service updated successfully', { serviceId: service.id });

            return {
                success: true,
                code: 200,
                message: 'Service updated successfully',
                data: service,
            };
        } catch (error: any) {
            this.logger.error('Error updating service', { serviceId: id, error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error updating service',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
