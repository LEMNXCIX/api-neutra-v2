import { Request, Response } from 'express';
import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { CreateRoleUseCase } from '@/use-cases/roles/create-role.use-case';
import { GetRolesUseCase } from '@/use-cases/roles/get-roles.use-case';
import { UpdateRoleUseCase } from '@/use-cases/roles/update-role.use-case';
import { DeleteRoleUseCase } from '@/use-cases/roles/delete-role.use-case';

import { IUserRepository } from '@/core/repositories/user.repository.interface';

export class RoleController {
    constructor(
        private roleRepository: IRoleRepository,
        private userRepository: IUserRepository
    ) { }

    create = async (req: Request, res: Response) => {
        const useCase = new CreateRoleUseCase(this.roleRepository);
        const result = await useCase.execute(req.body);
        return res.status(result.code).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const useCase = new GetRolesUseCase(this.roleRepository);
        const result = await useCase.execute();
        return res.status(result.code).json(result);
    }

    getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new GetRolesUseCase(this.roleRepository);
        const result = await useCase.executeById(id);
        return res.status(result.code).json(result);
    }

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new UpdateRoleUseCase(this.roleRepository, this.userRepository);
        const result = await useCase.execute(id, req.body);
        return res.status(result.code).json(result);
    }

    delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new DeleteRoleUseCase(this.roleRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }
}
