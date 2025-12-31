import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';

export class AssignRoleToUserUseCase {
    private redis: RedisProvider;

    constructor(
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository,
        private staffRepository: IStaffRepository
    ) {
        this.redis = RedisProvider.getInstance();
    }

    async execute(tenantId: string | undefined, userId: string, roleId: string) {
        if (!tenantId) {
            return {
                success: false,
                code: 400,
                message: 'TenantId is required for role assignment'
            };
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            return {
                success: false,
                code: 404,
                message: 'User not found',
                data: null
            };
        }

        const role = await this.roleRepository.findById(tenantId, roleId);
        if (!role) {
            return {
                success: false,
                code: 404,
                message: 'Role not found',
                data: null
            };
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
        // If changing FROM staff to something else, maybe deactivate staff?
        // (This gets tricky if we don't know the PREVIOUS role here)
        // But we can check if a staff record exists and deactivate it if new role is NOT staff
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

        return {
            success: true,
            code: 200,
            message: 'Role assigned successfully',
            data: updatedUser
        };
    }
}
