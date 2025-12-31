import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { CreateStaffDTO } from '@/core/entities/staff.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { ValidationErrorCodes } from '@/types/error-codes';
import { prisma } from '@/config/db.config';

export class CreateStaffUseCase {
    constructor(
        private staffRepository: IStaffRepository,
        private userRepository: IUserRepository,
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
            let userId = data.userId;

            // If email is provided, try to find an existing user or create one?
            // For now, let's look for an existing user to link.
            if (!userId && data.email) {
                const user = await this.userRepository.findByEmail(data.email);
                if (user) {
                    userId = user.id;
                    this.logger.info('Found existing user to link to staff', { userId, email: data.email });
                }
            }

            // If we have a userId, ensure they have the STAFF role in this tenant
            if (userId) {
                const role = await (prisma as any).role.findFirst({
                    where: { name: 'STAFF', tenantId }
                });

                if (role) {
                    await this.userRepository.addTenant(userId, tenantId, role.id);
                }
            }

            const staff = await this.staffRepository.create(tenantId, {
                ...data,
                userId
            });

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
