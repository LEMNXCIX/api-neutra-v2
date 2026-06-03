import { Request, Response } from "express";
import { GetAllUsersUseCase } from "@/core/application/users/get-all-users.use-case";
import { GetUserByIdUseCase } from "@/core/application/users/get-user-by-id.use-case";
import { GetUserByEmailUseCase } from "@/core/application/users/get-user-by-email.use-case";
import { GetUsersStatsUseCase } from "@/core/application/users/get-users-stats.use-case";
import { GetUsersSummaryStatsUseCase } from "@/core/application/users/get-users-summary-stats.use-case";
import { CreateUserUseCase } from "@/core/application/users/create-user.use-case";
import { GetOrCreateByProviderUseCase } from "@/core/application/users/get-or-create-by-provider.use-case";
import { UpdateUserUseCase } from "@/core/application/users/update-user.use-case";
import { DeleteUserUseCase } from "@/core/application/users/delete-user.use-case";
import { AssignRoleToUserUseCase } from "@/core/application/users/assign-role.use-case";
import { Success } from "@/core/utils/use-case-result";
import { UserPresenter } from "@/core/presenters/user.presenter";

export class UserController {
    constructor(
        private getAllUsersUseCase: GetAllUsersUseCase,
        private getUserByIdUseCase: GetUserByIdUseCase,
        private getUserByEmailUseCase: GetUserByEmailUseCase,
        private getUsersStatsUseCase: GetUsersStatsUseCase,
        private getUsersSummaryStatsUseCase: GetUsersSummaryStatsUseCase,
        private createUserUseCase: CreateUserUseCase,
        private getOrCreateByProviderUseCase: GetOrCreateByProviderUseCase,
        private updateUserUseCase: UpdateUserUseCase,
        private deleteUserUseCase: DeleteUserUseCase,
        private assignRoleToUserUseCase: AssignRoleToUserUseCase,
    ) {}

    getAll = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.getAllUsersUseCase.execute(tenantId);
        if (result.success && result.data) {
            result.data = UserPresenter.toResponseList(result.data) as any;
        }
        return res.json(result);
    };

  getById = async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const result = await this.getUserByIdUseCase.execute(tenantId, id);
    if (result.success && result.data) {
      result.data = UserPresenter.toResponse(result.data) as any;
    }
    return res.json(result);
  };

  getByEmail = async (req: Request, res: Response) => {
    const tenantId = (req as any).tenantId;
    const { email } = req.params;
    const result = await this.getUserByEmailUseCase.execute(
      tenantId,
      email,
      false,
    );
    if (result.success && result.data) {
      result.data = UserPresenter.toPublicResponse(result.data) as any;
        }
        return res.json(result);
    };

    create = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.createUserUseCase.execute(tenantId, req.body);
        if (result.success && result.data?.user) {
            result.data = {
                ...result.data,
                user: UserPresenter.toResponse(result.data.user) as any,
            };
        }
        return res.status(201).json(result);
    };

    getOrCreateByProvider = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.getOrCreateByProviderUseCase.execute(
            tenantId,
            req.body,
        );
        if (result.success && result.data?.user) {
            result.data = {
                ...result.data,
                user: UserPresenter.toResponse(result.data.user) as any,
            };
        }
        return res.json(result);
    };

    getUsersStats = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        const result = await this.getUsersStatsUseCase.execute(tenantId);
        return res.json(result);
    };

    getSummaryStats = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        const result = await this.getUsersSummaryStatsUseCase.execute(tenantId);
        return res.json(result);
    };

    update = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.updateUserUseCase.execute(
            tenantId,
            id,
            req.body,
        );
        if (result.success && result.data) {
            result.data = UserPresenter.toResponse(result.data) as any;
        }
        return res.json(result);
    };

    assignRole = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const { roleId } = req.body;
        const result = await this.assignRoleToUserUseCase.execute(
            tenantId,
            id,
            roleId,
        );
        if (result.success && result.data) {
            result.data = UserPresenter.toResponse(result.data) as any;
        }
        return res.json(result);
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.deleteUserUseCase.execute(tenantId, id);
        return res.json(result);
    };
}
