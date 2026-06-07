import { Request, Response } from "express";
import { CreatePermissionUseCase } from "@/core/application/permissions/create-permission.use-case";
import { GetPermissionsUseCase } from "@/core/application/permissions/get-permissions.use-case";
import { UpdatePermissionUseCase } from "@/core/application/permissions/update-permission.use-case";
import { DeletePermissionUseCase } from "@/core/application/permissions/delete-permission.use-case";
import { GetPermissionsPaginatedUseCase } from "@/core/application/permissions/get-permissions-paginated.use-case";
import { PermissionPresenter } from "@/core/presenters/permission.presenter";
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
            req.body,
        );
        return res
            .status(201)
            .json(present(result, PermissionPresenter.toResponse));
    };

    getAll = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const page = req.query.page
            ? parseInt(req.query.page as string)
            : undefined;
        const limit = req.query.limit
            ? parseInt(req.query.limit as string)
            : undefined;
        const search = req.query.search
            ? (req.query.search as string)
            : undefined;

        if (page || limit || search) {
            const result = await this.getPermissionsPaginatedUseCase.execute(
                tenantId,
                page,
                limit,
                search,
            );
            return res.json(
                present(result, PermissionPresenter.toResponseList),
            );
        } else {
            const result = await this.getPermissionsUseCase.execute(tenantId);
            return res.json(
                present(result, PermissionPresenter.toResponseList),
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
        return res.json(present(result, PermissionPresenter.toResponse));
    };

    update = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updatePermissionUseCase.execute(
            tenantId,
            id,
            req.body,
        );
        return res.json(present(result, PermissionPresenter.toResponse));
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deletePermissionUseCase.execute(tenantId, id);
        return res.json(result);
    };
}
