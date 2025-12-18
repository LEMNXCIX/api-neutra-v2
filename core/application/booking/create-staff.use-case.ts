import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { CreateStaffDTO } from '@/core/entities/staff.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { ValidationErrorCodes } from '@/types/error-codes';

export class CreateStaffUseCase {
    constructor(
        private staffRepository: IStaffRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, data: CreateStaffDTO) {
        if (!data.name) {
            this.logger.warn('CreateStaff failed: missing name', { data });
            return {
                success: false,
                code: 400,
                message: 'Name is required',
                errors: [{
                    code: ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
                    message: 'Staff name is required',
                }],
            };
        }

        try {
            const staff = await this.staffRepository.create(tenantId, data);

            this.logger.info('Staff created successfully', { staffId: staff.id });

            return {
                success: true,
                code: 201,
                message: 'Staff member created successfully',
                data: staff,
            };
        } catch (error: any) {
            this.logger.error('Error creating staff', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error creating staff member',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
