import { IPermissionRepository } from "@/core/repositories/permission.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class DeletePermissionUseCase {
    constructor(private permissionRepository: IPermissionRepository) {}

    async execute(
        tenantId: string | undefined,
        id: string,
    ): Promise<UseCaseResult> {
        const existingPermission = await this.permissionRepository.findById(
            tenantId,
            id,
        );

        if (!existingPermission) {
            throw new EntityNotFoundError("Permission", id);
        }

        await this.permissionRepository.delete(tenantId, id);

        return Success(null, "Permission deleted successfully");
    }
}
