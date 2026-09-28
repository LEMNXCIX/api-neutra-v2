import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetRolesUseCase {
    constructor(private roleRepository: IRoleRepository) {}

    async execute(tenantId: string | undefined): Promise<UseCaseResult> {
        const roles = await this.roleRepository.findAll(tenantId);
        return Success(roles, "Roles retrieved successfully");
    }

    async executeById(
        tenantId: string | undefined,
        id: string,
    ): Promise<UseCaseResult> {
        const role = await this.roleRepository.findById(tenantId, id);

        if (!role) {
            throw new EntityNotFoundError("Role", id);
        }

        return Success(role, "Role retrieved successfully");
    }
}
