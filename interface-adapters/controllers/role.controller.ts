import { Request, Response } from 'express';
import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { CreateRoleUseCase } from '@/core/application/roles/create-role.use-case';
import { GetRolesUseCase } from '@/core/application/roles/get-roles.use-case';
import { UpdateRoleUseCase } from '@/core/application/roles/update-role.use-case';
import { DeleteRoleUseCase } from '@/core/application/roles/delete-role.use-case';
import { GetRolesPaginatedUseCase } from '@/core/application/roles/get-roles-paginated.use-case';

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
        const page = req.query.page ? parseInt(req.query.page as string) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        const search = req.query.search ? (req.query.search as string) : undefined;

        if (page || limit || search) {
            const useCase = new GetRolesPaginatedUseCase(this.roleRepository);
            const result = await useCase.execute(page, limit, search);
            return res.status(result.code).json(result);
        } else {
            const useCase = new GetRolesUseCase(this.roleRepository);
            const result = await useCase.execute();
            return res.status(result.code).json(result);
        }
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
