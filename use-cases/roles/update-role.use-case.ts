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

    async execute(id: string, data: UpdateRoleDTO) {
        const existingRole = await this.roleRepository.findById(id);

        if (!existingRole) {
            return {
                success: false,
                code: 404,
                message: 'Role not found',
                data: null
            };
        }

        if (data.name) {
            const roleWithSameName = await this.roleRepository.findByName(data.name);
            if (roleWithSameName && roleWithSameName.id !== id) {
                return {
                    success: false,
                    code: 409,
                    message: 'Role name already in use',
                    data: null
                };
            }
        }

        const updatedRole = await this.roleRepository.update(id, data);

        // Invalidate cache for all users with this role
        // This is necessary because permissions might have changed
        const users = await this.userRepository.findByRoleId(id);

        if (users.length > 0) {
            const pipeline = this.redis['client'].multi(); // Accessing client directly for pipeline if available, or just loop
            // RedisProvider wrapper doesn't expose multi/pipeline yet, let's just loop for now or add pipeline support.
            // Looping is fine for now unless we have thousands of users.

            for (const user of users) {
                await this.redis.del(`user:permissions:${user.id}`);
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
