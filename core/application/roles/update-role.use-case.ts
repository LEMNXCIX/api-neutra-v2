import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { UpdateRoleDTO } from '@/core/entities/role.entity';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class UpdateRoleUseCase {
    private redis: RedisProvider;

    constructor(
        private roleRepository: IRoleRepository,
        private userRepository: IUserRepository
    ) {
        this.redis = RedisProvider.getInstance();
    }

    async execute(tenantId: string | undefined, id: string, data: UpdateRoleDTO): Promise<UseCaseResult> {
        const existingRole = await this.roleRepository.findById(tenantId, id);

        if (!existingRole) {
            throw new AppError('Role not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        if (data.name) {
            const roleWithSameName = await this.roleRepository.findByName(tenantId, data.name);
            if (roleWithSameName && roleWithSameName.id !== id) {
                throw new AppError('Role name already in use', 409, ResourceErrorCodes.ALREADY_EXISTS);
            }
        }

        const updatedRole = await this.roleRepository.update(tenantId, id, data);

        if (tenantId) {
            const users = await this.userRepository.findByRoleId(tenantId, id);

            if (users.length > 0) {
                for (const user of users) {
                    await this.redis.del(`user:permissions:${user.id}:${tenantId}`);
                }
            }
        }

        return Success(updatedRole, 'Role updated successfully');
    }
}
