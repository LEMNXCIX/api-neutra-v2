import { IRoleRepository, RoleUpdateData } from "@/core/repositories/role.repository.interface";
import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { UpdateRoleDTO } from "@/core/application/dtos/requests/role.request";
import { ICacheProvider } from "@/core/providers/cache-provider.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    DuplicateEntityError,
} from "@/core/domain/errors/domain-errors";

export class UpdateRoleUseCase {
    constructor(
        private roleRepository: IRoleRepository,
        private userRepository: IUserRepository,
        private cacheProvider: ICacheProvider,
    ) {}

    async execute(
        tenantId: string | undefined,
        id: string,
        data: UpdateRoleDTO,
    ): Promise<UseCaseResult> {
        const existingRole = await this.roleRepository.findById(tenantId, id);

        if (!existingRole) {
            throw new EntityNotFoundError("Role", id);
        }

        if (data.name) {
            const roleWithSameName = await this.roleRepository.findByName(
                tenantId,
                data.name,
            );
            if (roleWithSameName && roleWithSameName.id !== id) {
                throw new DuplicateEntityError("Role", "name", data.name);
            }
        }

        const updateData: RoleUpdateData = {
            name: data.name,
            description: data.description,
            level: data.level,
            active: data.active,
            permissionIds: data.permissionIds,
        };
        const updatedRole = await this.roleRepository.update(
            tenantId,
            id,
            updateData,
        );

        if (tenantId) {
            const users = await this.userRepository.findByRoleId(tenantId, id);

            if (users.length > 0) {
                for (const user of users) {
                    await this.cacheProvider.del(
                        `user:permissions:${user.id}:${tenantId}`,
                    );
                }
            }
        }

        return Success(updatedRole, "Role updated successfully");
    }
}
