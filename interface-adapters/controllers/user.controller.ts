import { Request, Response } from 'express';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { GetAllUsersUseCase } from '@/core/application/users/get-all-users.use-case';
import { GetUserByIdUseCase } from '@/core/application/users/get-user-by-id.use-case';
import { GetUserByEmailUseCase } from '@/core/application/users/get-user-by-email.use-case';
import { GetUsersStatsUseCase } from '@/core/application/users/get-users-stats.use-case';
import { GetUsersSummaryStatsUseCase } from '@/core/application/users/get-users-summary-stats.use-case';
import { CreateUserUseCase } from '@/core/application/users/create-user.use-case';
import { GetOrCreateByProviderUseCase } from '@/core/application/users/get-or-create-by-provider.use-case';
import { UpdateUserUseCase } from '@/core/application/users/update-user.use-case';
import { DeleteUserUseCase } from '@/core/application/users/delete-user.use-case';
import { AssignRoleToUserUseCase } from '@/core/application/users/assign-role.use-case';
import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { PrismaStaffRepository } from '@/infrastructure/database/prisma/staff.prisma-repository';

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
        private assignRoleToUserUseCase: AssignRoleToUserUseCase
    ) { }

    getAll = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.getAllUsersUseCase.execute(tenantId);
        return res.json(result);
    }

    getById = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const result = await this.getUserByIdUseCase.execute(tenantId, id);
        return res.json(result);
    }

    getByEmail = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { email } = req.params;
        const result = await this.getUserByEmailUseCase.execute(tenantId, email, false);
        return res.json(result);
    }

    create = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.createUserUseCase.execute(tenantId, req.body);
        return res.status(201).json(result);
    }

    getOrCreateByProvider = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.getOrCreateByProviderUseCase.execute(tenantId, req.body);
        return res.json(result);
    }

    getUsersStats = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        const result = await this.getUsersStatsUseCase.execute(tenantId);
        return res.json(result);
    }

    getSummaryStats = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        const result = await this.getUsersSummaryStatsUseCase.execute(tenantId);
        return res.json(result);
    }

    update = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.updateUserUseCase.execute(tenantId, id, req.body);
        return res.json(result);
    }

    assignRole = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const { roleId } = req.body;
        const result = await this.assignRoleToUserUseCase.execute(tenantId, id, roleId);
        return res.json(result);
    }

    delete = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.deleteUserUseCase.execute(tenantId, id);
        return res.json(result);
    }
}
