import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { UpdateStaffDTO } from '@/core/entities/staff.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { ValidationErrorCodes } from '@/types/error-codes';

export class UpdateStaffUseCase {
    constructor(
        private staffRepository: IStaffRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, id: string, data: UpdateStaffDTO) {
        if (data.name === '') {
            this.logger.warn('UpdateStaff failed: empty name', { id, data });
            return {
                success: false,
                code: 400,
                message: 'Name cannot be empty',
                errors: [{
                    code: ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
                    message: 'Staff name is required',
                }],
            };
        }

        try {
            const existingStaff = await this.staffRepository.findById(tenantId, id);
            if (!existingStaff) {
                return {
                    success: false,
                    code: 404,
                    message: 'Staff member not found',
                };
            }

            const staff = await this.staffRepository.update(tenantId, id, data);

            this.logger.info('Staff updated successfully', { staffId: staff.id });

            return {
                success: true,
                code: 200,
                message: 'Staff member updated successfully',
                data: staff,
            };
        } catch (error: any) {
            this.logger.error('Error updating staff', { staffId: id, error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error updating staff member',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
