import { IRoleRepository, RoleCreateData } from "@/core/repositories/role.repository.interface";
import { CreateRoleDTO } from "@/core/application/dtos/requests/role.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { DuplicateEntityError } from "@/core/domain/errors/domain-errors";

export class CreateRoleUseCase {
    constructor(private roleRepository: IRoleRepository) {}

    async execute(
        tenantId: string | undefined,
        data: CreateRoleDTO,
    ): Promise<UseCaseResult> {
        const existingRole = await this.roleRepository.findByName(
            tenantId,
            data.name,
        );

        if (existingRole) {
            throw new DuplicateEntityError("Role", "name", data.name);
        }

        const createData: RoleCreateData = {
            name: data.name,
            description: data.description,
            level: data.level,
            active: data.active,
            permissionIds: data.permissionIds,
        };
        const role = await this.roleRepository.create(tenantId, createData);

        return Success(role, "Role created successfully");
    }
}
