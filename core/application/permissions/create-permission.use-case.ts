import { IPermissionRepository } from "@/core/repositories/permission.repository.interface";
import { CreatePermissionDTO } from "@/core/application/dtos/requests/permission.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { DuplicateEntityError } from "@/core/domain/errors/domain-errors";

export class CreatePermissionUseCase {
    constructor(private permissionRepository: IPermissionRepository) {}

    async execute(
        tenantId: string | undefined,
        data: CreatePermissionDTO,
    ): Promise<UseCaseResult> {
        const existingPermission = await this.permissionRepository.findByName(
            tenantId,
            data.name,
        );

        if (existingPermission) {
            throw new DuplicateEntityError("Permission", "name", data.name);
        }

        const permission = await this.permissionRepository.create(
            tenantId,
            data,
        );

        return Success(permission, "Permission created successfully");
    }
}
