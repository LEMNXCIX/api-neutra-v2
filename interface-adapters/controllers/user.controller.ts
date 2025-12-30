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
        private userRepository: IUserRepository,
        private cartRepository: ICartRepository,
        private roleRepository: IRoleRepository,
        private staffRepository: IStaffRepository
    ) { }

    getAll = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        const useCase = new GetAllUsersUseCase(this.userRepository);
        const result = await useCase.execute(tenantId);
        return res.status(result.code).json(result);
    }

    getById = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        if (!tenantId) {
            // For management routes we might not have a tenantId in context if global,
            // but findById usually requires one for security unless strictly for super admin.
            // For now we keep it required for specific user lookups by ID outside of lists.
        }
        const { id } = req.params;
        const useCase = new GetUserByIdUseCase(this.userRepository);
        const result = await useCase.execute(tenantId, id);
        return res.status(result.code).json(result);
    }

    getByEmail = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { email } = req.params;
        const useCase = new GetUserByEmailUseCase(this.userRepository);
        const result = await useCase.execute(tenantId, email, false);
        return res.status(result.code).json(result);
    }

    create = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const useCase = new CreateUserUseCase(this.userRepository, this.cartRepository);
        const result = await useCase.execute(tenantId, req.body);
        return res.status(result.code).json(result);
    }

    getOrCreateByProvider = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const useCase = new GetOrCreateByProviderUseCase(this.userRepository, this.cartRepository);
        const result = await useCase.execute(tenantId, req.body);
        return res.status(result.code).json(result);
    }

    getUsersStats = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        const useCase = new GetUsersStatsUseCase(this.userRepository);
        const result = await useCase.execute(tenantId);
        return res.status(result.code).json(result);
    }

    getSummaryStats = async (req: Request, res: Response) => {
        const tenantId = req.tenantId;
        const useCase = new GetUsersSummaryStatsUseCase(this.userRepository);
        const result = await useCase.execute(tenantId);
        return res.status(result.code).json(result);
    }

    update = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new UpdateUserUseCase(this.userRepository);
        const result = await useCase.execute(tenantId, id, req.body);
        return res.status(result.code).json(result);
    }

    assignRole = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const { roleId } = req.body;
        const useCase = new AssignRoleToUserUseCase(this.userRepository, this.roleRepository, this.staffRepository); // Need staffRepository
        const result = await useCase.execute(tenantId, id, roleId);
        return res.status(result.code).json(result);
    }

    delete = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new DeleteUserUseCase(this.userRepository);
        const result = await useCase.execute(tenantId, id);
        return res.status(result.code).json(result);
    }
}
