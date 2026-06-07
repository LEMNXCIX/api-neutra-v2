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
import { present } from "@/core/utils/use-case-result";
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
        const tenantId = req.tenantId!;
        const result = await this.getAllUsersUseCase.execute(tenantId);
        return res.json(present(result, UserPresenter.toResponseList));
    };

    getById = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const result = await this.getUserByIdUseCase.execute(tenantId, id);
        return res.json(present(result, UserPresenter.toResponse));
    };

    getByEmail = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { email } = req.params;
        const result = await this.getUserByEmailUseCase.execute(
            tenantId,
            email,
            false,
        );
        return res.json(present(result, UserPresenter.toPublicResponse));
    };

    create = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.createUserUseCase.execute(tenantId, req.body);
        return res.status(201).json(
            present(result, (data) => ({
                ...data,
                user: UserPresenter.toResponse(data.user),
            })),
        );
    };

    getOrCreateByProvider = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.getOrCreateByProviderUseCase.execute(
            tenantId,
            req.body,
        );
        return res.json(
            present(result, (data) => ({
                ...data,
                user: UserPresenter.toResponse(data.user),
            })),
        );
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
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateUserUseCase.execute(
            tenantId,
            id,
            req.body,
        );
        return res.json(present(result, UserPresenter.toResponse));
    };

    assignRole = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const { roleId } = req.body;
        const result = await this.assignRoleToUserUseCase.execute(
            tenantId,
            id,
            roleId,
        );
        return res.json(present(result, UserPresenter.toResponse));
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deleteUserUseCase.execute(tenantId, id);
        return res.json(result);
    };
}
