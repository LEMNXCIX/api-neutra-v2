import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes, ValidationErrorCodes } from '@/types/error-codes';

export class AssignRoleToUserUseCase {
    private redis: RedisProvider;

    constructor(
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository,
        private staffRepository: IStaffRepository
    ) {
        this.redis = RedisProvider.getInstance();
    }

    async execute(tenantId: string | undefined, userId: string, roleId: string): Promise<UseCaseResult> {
        if (!tenantId) {
            throw new AppError('TenantId is required for role assignment', 400, ValidationErrorCodes.MISSING_REQUIRED_FIELDS);
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        const role = await this.roleRepository.findById(tenantId, roleId);
        if (!role) {
            throw new AppError('Role not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        // Add/Update user-tenant relation with new roleId
        await this.userRepository.addTenant(userId, tenantId, roleId);

        // STAFF Sync Logic: If new role is STAFF, Ensure Staff record exists
        if (role.name === 'STAFF') {
            const existingStaff = await this.staffRepository.findByUserId(tenantId, userId);
            if (!existingStaff) {
                await this.staffRepository.create(tenantId, {
                    userId: userId,
                    name: user.name,
                    email: user.email,
                    active: true,
                    workingHours: {}
                });
            } else if (!existingStaff.active) {
                await this.staffRepository.update(tenantId, existingStaff.id, { active: true });
            }
        }
        else {
            const existingStaff = await this.staffRepository.findByUserId(tenantId, userId);
            if (existingStaff && existingStaff.active) {
                await this.staffRepository.update(tenantId, existingStaff.id, { active: false });
            }
        }

        // Fetch user with updated role info
        const updatedUser = await this.userRepository.findById(userId, { includeRole: true });

        // Invalidate user permissions cache for this specific tenant context
        await this.redis.del(`user:permissions:${userId}:${tenantId}`);

        return Success(updatedUser, 'Role assigned successfully');
    }
}
