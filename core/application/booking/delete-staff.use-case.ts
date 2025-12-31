import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class DeleteStaffUseCase {
    constructor(
        private staffRepository: IStaffRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, id: string) {
        try {
            const existingStaff = await this.staffRepository.findById(tenantId, id);
            if (!existingStaff) {
                return {
                    success: false,
                    code: 404,
                    message: 'Staff member not found',
                };
            }

            await this.staffRepository.delete(tenantId, id);

            this.logger.info('Staff deleted successfully', { staffId: id });

            return {
                success: true,
                code: 200,
                message: 'Staff member deleted successfully',
            };
        } catch (error: any) {
            this.logger.error('Error deleting staff', { staffId: id, error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error deleting staff member',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
