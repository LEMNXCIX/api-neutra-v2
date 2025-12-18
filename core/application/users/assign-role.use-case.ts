import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';

export class AssignRoleToUserUseCase {
    private redis: RedisProvider;

    constructor(
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository
    ) {
        this.redis = RedisProvider.getInstance();
    }

    async execute(tenantId: string | undefined, userId: string, roleId: string) {
        const user = await this.userRepository.findById(tenantId, userId);
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

        // Update user with new roleId
        // We use the generic update method. The repository handles role relation update via roleId.
        const updatedUser = await this.userRepository.update(tenantId, userId, { roleId });

        // Invalidate user permissions cache
        await this.redis.del(`user:permissions:${userId}`);

        return {
            success: true,
            code: 200,
            message: 'Role assigned successfully',
            data: updatedUser
        };
    }
}
