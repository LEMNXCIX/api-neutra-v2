import type { UpdatePermissionDTO } from "@/core/application/dtos/requests/permission.request";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";
import type {
    IPermissionRepository,
    PermissionUpdateData,
} from "@/core/repositories/permission.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

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

        const updateData: PermissionUpdateData = {
            name: data.name,
            description: data.description,
            active: data.active,
        };
        const updatedPermission = await this.permissionRepository.update(
            tenantId,
            id,
            updateData,
        );

        return Success(updatedPermission, "Permission updated successfully");
    }
}
