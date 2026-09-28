import type { Request, Response } from "express";
import type {
    AssignRoleDTO,
    UpdateUserDTO,
} from "@/core/application/dtos/requests/user.request";
import { UserResponse } from "@/core/application/dtos/responses/user/user.response";
import { UserPublicResponse } from "@/core/application/dtos/responses/user/user-public.response";
import type { AssignRoleToUserUseCase } from "@/core/application/users/assign-role.use-case";
import type { CreateUserUseCase } from "@/core/application/users/create-user.use-case";
import type { DeleteUserUseCase } from "@/core/application/users/delete-user.use-case";
import type { GetAllUsersUseCase } from "@/core/application/users/get-all-users.use-case";
import type { GetOrCreateByProviderUseCase } from "@/core/application/users/get-or-create-by-provider.use-case";
import type { GetUserByEmailUseCase } from "@/core/application/users/get-user-by-email.use-case";
import type { GetUserByIdUseCase } from "@/core/application/users/get-user-by-id.use-case";
import type { GetUsersStatsUseCase } from "@/core/application/users/get-users-stats.use-case";
import type { GetUsersSummaryStatsUseCase } from "@/core/application/users/get-users-summary-stats.use-case";
import type { UpdateUserUseCase } from "@/core/application/users/update-user.use-case";
import { present } from "@/core/utils/use-case-result";

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
        return res.json(
            present(result, (users) =>
                Array.isArray(users)
                    ? users.map((u) => UserResponse.fromEntity(u))
                    : [],
            ),
        );
    };

    getById = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const result = await this.getUserByIdUseCase.execute(tenantId, id);
        return res.json(present(result, UserResponse.fromEntity));
    };

    getByEmail = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { email } = req.params;
        const result = await this.getUserByEmailUseCase.execute(
            tenantId,
            email,
            false,
        );
        return res.json(present(result, UserPublicResponse.fromEntity));
    };

    create = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.createUserUseCase.execute(tenantId, req.body);
        return res.status(201).json(
            present(result, (data) => ({
                ...data,
                user: UserResponse.fromEntity(data.user),
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
                user: UserResponse.fromEntity(data.user),
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
        // `users.routes.ts` has no `validateDto`, so `req.body` is whatever the
        // client sent. Reading the six admin-safe columns off it — rather than
        // forwarding it — is what keeps the provider ids, the reset pair and
        // `password` out of the write: those resolve through tenant-free
        // lookups (`findByProvider`, `findByResetToken`), so a body carrying
        // one of them is an account handover, and the repository stores
        // `password` unhashcd. A key not listed here is dropped, exactly like a
        // key that was never sent. Same shape as the destructuring in
        // getOrCreateByProvider above.
        const data: UpdateUserDTO = {
            name: req.body?.name,
            email: req.body?.email,
            profilePic: req.body?.profilePic,
            phone: req.body?.phone,
            pushToken: req.body?.pushToken,
            active: req.body?.active,
        };
        const result = await this.updateUserUseCase.execute(tenantId, id, data);
        return res.json(present(result, UserResponse.fromEntity));
    };

    assignRole = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const { roleId } = req.validatedBody as AssignRoleDTO;
        const result = await this.assignRoleToUserUseCase.execute(
            tenantId,
            id,
            roleId,
        );
        return res.json(present(result, UserResponse.fromEntity));
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deleteUserUseCase.execute(tenantId, id);
        return res.json(result);
    };
}
