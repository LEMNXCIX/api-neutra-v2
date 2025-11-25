import { Request, Response } from 'express';
import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { CreatePermissionUseCase } from '@/use-cases/permissions/create-permission.use-case';
import { GetPermissionsUseCase } from '@/use-cases/permissions/get-permissions.use-case';
import { UpdatePermissionUseCase } from '@/use-cases/permissions/update-permission.use-case';
import { DeletePermissionUseCase } from '@/use-cases/permissions/delete-permission.use-case';

export class PermissionController {
    constructor(private permissionRepository: IPermissionRepository) { }

    create = async (req: Request, res: Response) => {
        const useCase = new CreatePermissionUseCase(this.permissionRepository);
        const result = await useCase.execute(req.body);
        return res.status(result.code).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const useCase = new GetPermissionsUseCase(this.permissionRepository);
        const result = await useCase.execute();
        return res.status(result.code).json(result);
    }

    getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new GetPermissionsUseCase(this.permissionRepository);
        const result = await useCase.executeById(id);
        return res.status(result.code).json(result);
    }

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new UpdatePermissionUseCase(this.permissionRepository);
        const result = await useCase.execute(id, req.body);
        return res.status(result.code).json(result);
    }

    delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new DeletePermissionUseCase(this.permissionRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }
}
