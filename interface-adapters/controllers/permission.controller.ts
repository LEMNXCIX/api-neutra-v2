import type { Request, Response } from "express";
import type { PagedSearchQueryDto } from "@/core/application/dtos/requests/list-query.dto";
import type {
    CreatePermissionDTO,
    UpdatePermissionDTO,
} from "@/core/application/dtos/requests/permission.request";
import { PermissionResponse } from "@/core/application/dtos/responses/permission/permission.response";
import type { CreatePermissionUseCase } from "@/core/application/permissions/create-permission.use-case";
import type { DeletePermissionUseCase } from "@/core/application/permissions/delete-permission.use-case";
import type { GetPermissionsUseCase } from "@/core/application/permissions/get-permissions.use-case";
import type { GetPermissionsPaginatedUseCase } from "@/core/application/permissions/get-permissions-paginated.use-case";
import type { UpdatePermissionUseCase } from "@/core/application/permissions/update-permission.use-case";
import { parsePagination } from "@/core/utils/pagination";
import { present } from "@/core/utils/use-case-result";

export class PermissionController {
    constructor(
        private createPermissionUseCase: CreatePermissionUseCase,
        private getPermissionsUseCase: GetPermissionsUseCase,
        private updatePermissionUseCase: UpdatePermissionUseCase,
        private deletePermissionUseCase: DeletePermissionUseCase,
        private getPermissionsPaginatedUseCase: GetPermissionsPaginatedUseCase,
    ) {}

    create = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.createPermissionUseCase.execute(
            tenantId,
            req.validatedBody as CreatePermissionDTO,
        );
        return res
            .status(201)
            .json(present(result, PermissionResponse.fromEntity));
    };

    getAll = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const query = (req.validatedQuery ?? {}) as PagedSearchQueryDto;
        const { page, limit } = parsePagination(query);

        if (query.page || query.limit || query.search) {
            const result = await this.getPermissionsPaginatedUseCase.execute(
                tenantId,
                query.page ? page : undefined,
                query.limit ? limit : undefined,
                query.search,
            );
            return res.json(
                present(result, (permissions) =>
                    Array.isArray(permissions)
                        ? permissions.map((p) =>
                              PermissionResponse.fromEntity(p),
                          )
                        : [],
                ),
            );
        } else {
            const result = await this.getPermissionsUseCase.execute(tenantId);
            return res.json(
                present(result, (permissions) =>
                    Array.isArray(permissions)
                        ? permissions.map((p) =>
                              PermissionResponse.fromEntity(p),
                          )
                        : [],
                ),
            );
        }
    };

    getById = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.getPermissionsUseCase.executeById(
            tenantId,
            id,
        );
        return res.json(present(result, PermissionResponse.fromEntity));
    };

    update = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updatePermissionUseCase.execute(
            tenantId,
            id,
            req.validatedBody as UpdatePermissionDTO,
        );
        return res.json(present(result, PermissionResponse.fromEntity));
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deletePermissionUseCase.execute(tenantId, id);
        return res.json(result);
    };
}
