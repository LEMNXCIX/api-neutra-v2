import type { Request, Response } from "express";
import type { PagedSearchQueryDto } from "@/core/application/dtos/requests/list-query.dto";
import type {
    CreateRoleDTO,
    UpdateRoleDTO,
} from "@/core/application/dtos/requests/role.request";
import { RoleResponse } from "@/core/application/dtos/responses/role/role.response";
import type { CreateRoleUseCase } from "@/core/application/roles/create-role.use-case";
import type { DeleteRoleUseCase } from "@/core/application/roles/delete-role.use-case";
import type { GetRolesUseCase } from "@/core/application/roles/get-roles.use-case";
import type { GetRolesPaginatedUseCase } from "@/core/application/roles/get-roles-paginated.use-case";
import type { UpdateRoleUseCase } from "@/core/application/roles/update-role.use-case";
import { parsePagination } from "@/core/utils/pagination";
import { present } from "@/core/utils/use-case-result";
import { tenantIdOf } from "@/helpers/request-context.helpers";

export class RoleController {
    constructor(
        private createRoleUseCase: CreateRoleUseCase,
        private getRolesUseCase: GetRolesUseCase,
        private updateRoleUseCase: UpdateRoleUseCase,
        private deleteRoleUseCase: DeleteRoleUseCase,
        private getRolesPaginatedUseCase: GetRolesPaginatedUseCase,
    ) {}

    create = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);
        // `role.routes.ts` carries no `validateDto`, so `req.body` is whatever
        // the client sent. Reading the five fields a role write accepts —
        // rather than forwarding it — keeps the body equal to the
        // repository's own allowlist: a `tenantId` in the body is not what
        // scopes the role, and any other key is one the repository does not
        // copy, so forwarding it only widens the set of things that can reach
        // a future column. Same shape as UserController.update after bd92bab.
        const data: CreateRoleDTO = {
            name: req.body?.name,
            description: req.body?.description,
            level: req.body?.level,
            active: req.body?.active,
            permissionIds: req.body?.permissionIds,
        };
        const result = await this.createRoleUseCase.execute(tenantId, data);
        return res.status(201).json(present(result, RoleResponse.fromEntity));
    };

    getAll = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);
        const query = (req.validatedQuery ?? {}) as PagedSearchQueryDto;
        const { page, limit } = parsePagination(query);

        if (query.page || query.limit || query.search) {
            const result = await this.getRolesPaginatedUseCase.execute(
                tenantId,
                query.page ? page : undefined,
                query.limit ? limit : undefined,
                query.search,
            );
            return res.json(
                present(result, (roles) =>
                    Array.isArray(roles)
                        ? roles.map((r) => RoleResponse.fromEntity(r))
                        : [],
                ),
            );
        } else {
            const result = await this.getRolesUseCase.execute(tenantId);
            return res.json(
                present(result, (roles) =>
                    Array.isArray(roles)
                        ? roles.map((r) => RoleResponse.fromEntity(r))
                        : [],
                ),
            );
        }
    };

    getById = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;
        const result = await this.getRolesUseCase.executeById(tenantId, id);
        return res.json(present(result, RoleResponse.fromEntity));
    };

    update = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;
        // Same narrowing as `create` above: five fields, no `validateDto` to
        // do it, and the update path replaces the role's whole permission set,
        // so anything extra in the body is a chance to reach a column the
        // repository never meant to expose on this endpoint.
        const data: UpdateRoleDTO = {
            name: req.body?.name,
            description: req.body?.description,
            level: req.body?.level,
            active: req.body?.active,
            permissionIds: req.body?.permissionIds,
        };
        const result = await this.updateRoleUseCase.execute(tenantId, id, data);
        return res.json(present(result, RoleResponse.fromEntity));
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;
        const result = await this.deleteRoleUseCase.execute(tenantId, id);
        return res.json(result);
    };
}
