import { Request, Response } from "express";
import { CreateRoleUseCase } from "@/core/application/roles/create-role.use-case";
import { GetRolesUseCase } from "@/core/application/roles/get-roles.use-case";
import { UpdateRoleUseCase } from "@/core/application/roles/update-role.use-case";
import { DeleteRoleUseCase } from "@/core/application/roles/delete-role.use-case";
import { GetRolesPaginatedUseCase } from "@/core/application/roles/get-roles-paginated.use-case";
import { RolePresenter } from "@/core/presenters/role.presenter";
import { present } from "@/core/utils/use-case-result";

export class RoleController {
    constructor(
        private createRoleUseCase: CreateRoleUseCase,
        private getRolesUseCase: GetRolesUseCase,
        private updateRoleUseCase: UpdateRoleUseCase,
        private deleteRoleUseCase: DeleteRoleUseCase,
        private getRolesPaginatedUseCase: GetRolesPaginatedUseCase,
    ) {}

    create = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.createRoleUseCase.execute(tenantId, req.body);
        return res.status(201).json(present(result, RolePresenter.toResponse));
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
            const result = await this.getRolesPaginatedUseCase.execute(
                tenantId,
                page,
                limit,
                search,
            );
            return res.json(present(result, RolePresenter.toResponseList));
        } else {
            const result = await this.getRolesUseCase.execute(tenantId);
            return res.json(present(result, RolePresenter.toResponseList));
        }
    };

    getById = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.getRolesUseCase.executeById(tenantId, id);
        return res.json(present(result, RolePresenter.toResponse));
    };

    update = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateRoleUseCase.execute(
            tenantId,
            id,
            req.body,
        );
        return res.json(present(result, RolePresenter.toResponse));
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deleteRoleUseCase.execute(tenantId, id);
        return res.json(result);
    };
}
