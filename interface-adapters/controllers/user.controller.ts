import { Request, Response } from 'express';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { GetAllUsersUseCase } from '@/use-cases/users/get-all-users.use-case';
import { GetUserByIdUseCase } from '@/use-cases/users/get-user-by-id.use-case';
import { GetUserByEmailUseCase } from '@/use-cases/users/get-user-by-email.use-case';
import { GetUsersStatsUseCase } from '@/use-cases/users/get-users-stats.use-case';
import { CreateUserUseCase } from '@/use-cases/users/create-user.use-case';
import { GetOrCreateByProviderUseCase } from '@/use-cases/users/get-or-create-by-provider.use-case';
import { UpdateUserUseCase } from '@/use-cases/users/update-user.use-case';
import { DeleteUserUseCase } from '@/use-cases/users/delete-user.use-case';
import { AssignRoleToUserUseCase } from '@/use-cases/users/assign-role.use-case';
import { IRoleRepository } from '@/core/repositories/role.repository.interface';

export class UserController {
    constructor(
        private userRepository: IUserRepository,
        private cartRepository: ICartRepository,
        private roleRepository: IRoleRepository
    ) { }

    getAll = async (req: Request, res: Response) => {
        const useCase = new GetAllUsersUseCase(this.userRepository);
        const result = await useCase.execute();
        return res.status(result.code).json(result);
    }

    getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new GetUserByIdUseCase(this.userRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }

    getByEmail = async (req: Request, res: Response) => {
        const { email } = req.params;
        const useCase = new GetUserByEmailUseCase(this.userRepository);
        const result = await useCase.execute(email, false);
        return res.status(result.code).json(result);
    }

    create = async (req: Request, res: Response) => {
        const useCase = new CreateUserUseCase(this.userRepository, this.cartRepository);
        const result = await useCase.execute(req.body);
        return res.status(result.code).json(result);
    }

    getOrCreateByProvider = async (req: Request, res: Response) => {
        const useCase = new GetOrCreateByProviderUseCase(this.userRepository, this.cartRepository);
        const result = await useCase.execute(req.body);
        return res.status(result.code).json(result);
    }

    getUsersStats = async (req: Request, res: Response) => {
        const useCase = new GetUsersStatsUseCase(this.userRepository);
        const result = await useCase.execute();
        return res.status(result.code).json(result);
    }

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new UpdateUserUseCase(this.userRepository);
        const result = await useCase.execute(id, req.body);
        return res.status(result.code).json(result);
    }

    assignRole = async (req: Request, res: Response) => {
        const { id } = req.params;
        const { roleId } = req.body;
        const useCase = new AssignRoleToUserUseCase(this.userRepository, this.roleRepository); // Need roleRepository
        const result = await useCase.execute(id, roleId);
        return res.status(result.code).json(result);
    }

    delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new DeleteUserUseCase(this.userRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }
}
