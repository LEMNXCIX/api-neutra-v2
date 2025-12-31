import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class GetStaffUseCase {
    constructor(
        private staffRepository: IStaffRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string | undefined, activeOnly: boolean = true) {
        try {
            const staffList = await this.staffRepository.findAll(tenantId, activeOnly);

            this.logger.info('Staff retrieved successfully', { count: staffList.length });

            return {
                success: true,
                code: 200,
                message: 'Staff retrieved successfully',
                data: staffList,
            };
        } catch (error: any) {
            this.logger.error('Error retrieving staff', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error retrieving staff',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
