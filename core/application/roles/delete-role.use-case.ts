import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ForbiddenError,
} from "@/core/domain/errors/domain-errors";

export class DeleteRoleUseCase {
    constructor(private roleRepository: IRoleRepository) {}

    async execute(
        tenantId: string | undefined,
        id: string,
    ): Promise<UseCaseResult> {
        const existingRole = await this.roleRepository.findById(tenantId, id);

        if (!existingRole) {
            throw new EntityNotFoundError("Role", id);
        }

        if (["ADMIN", "USER", "MANAGER"].includes(existingRole.name)) {
            if (existingRole.name === "ADMIN" || existingRole.name === "USER") {
                throw new ForbiddenError(
                    "Cannot delete system roles",
                    "FORBIDDEN",
                );
            }
        }

        await this.roleRepository.delete(tenantId, id);

        return Success(null, "Role deleted successfully");
    }
}
