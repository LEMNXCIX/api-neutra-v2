import { IPermissionRepository } from "@/core/repositories/permission.repository.interface";
import { UpdatePermissionDTO } from "@/core/application/dtos/requests/permission.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    DuplicateEntityError,
} from "@/core/domain/errors/domain-errors";

export class UpdatePermissionUseCase {
    constructor(private permissionRepository: IPermissionRepository) {}

    async execute(
        tenantId: string | undefined,
        id: string,
        data: UpdatePermissionDTO,
    ): Promise<UseCaseResult> {
        const existingPermission = await this.permissionRepository.findById(
            tenantId,
            id,
        );

        if (!existingPermission) {
            throw new EntityNotFoundError("Permission", id);
        }

        if (data.name) {
            const permissionWithSameName =
                await this.permissionRepository.findByName(tenantId, data.name);
            if (permissionWithSameName && permissionWithSameName.id !== id) {
                throw new DuplicateEntityError("Permission", "name", data.name);
            }
        }

        const updatedPermission = await this.permissionRepository.update(
            tenantId,
            id,
            data,
        );

        return Success(updatedPermission, "Permission updated successfully");
    }
}
