import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { UpdateRoleDTO } from '@/core/entities/role.entity';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';

export class UpdateRoleUseCase {
    private redis: RedisProvider;

    constructor(
        private roleRepository: IRoleRepository,
        private userRepository: IUserRepository
    ) {
        this.redis = RedisProvider.getInstance();
    }

    async execute(tenantId: string | undefined, id: string, data: UpdateRoleDTO) {
        const existingRole = await this.roleRepository.findById(tenantId, id);

        if (!existingRole) {
            return {
                success: false,
                code: 404,
                message: 'Role not found',
                data: null
            };
        }

        if (data.name) {
            const roleWithSameName = await this.roleRepository.findByName(tenantId, data.name);
            if (roleWithSameName && roleWithSameName.id !== id) {
                return {
                    success: false,
                    code: 409,
                    message: 'Role name already in use',
                    data: null
                };
            }
        }

        const updatedRole = await this.roleRepository.update(tenantId, id, data);

        // Invalidate cache for all users with this role
        // This is necessary because permissions might have changed
        if (tenantId) {
            const users = await this.userRepository.findByRoleId(tenantId, id);

            if (users.length > 0) {
                for (const user of users) {
                    await this.redis.del(`user:permissions:${user.id}:${tenantId}`);
                }
            }
        }

        return {
            success: true,
            code: 200,
            message: 'Role updated successfully',
            data: updatedRole
        };
    }
}
