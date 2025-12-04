import { Request, Response } from 'express';
import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { CreatePermissionUseCase } from '@/core/application/permissions/create-permission.use-case';
import { GetPermissionsUseCase } from '@/core/application/permissions/get-permissions.use-case';
import { UpdatePermissionUseCase } from '@/core/application/permissions/update-permission.use-case';
import { DeletePermissionUseCase } from '@/core/application/permissions/delete-permission.use-case';
import { GetPermissionsPaginatedUseCase } from '@/core/application/permissions/get-permissions-paginated.use-case';

export class PermissionController {
    constructor(private permissionRepository: IPermissionRepository) { }

    create = async (req: Request, res: Response) => {
        const useCase = new CreatePermissionUseCase(this.permissionRepository);
        const result = await useCase.execute(req.body);
        return res.status(result.code).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const page = req.query.page ? parseInt(req.query.page as string) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

        if (page || limit) {
            const useCase = new GetPermissionsPaginatedUseCase(this.permissionRepository);
            const result = await useCase.execute(page, limit);
            return res.status(result.code).json(result);
        } else {
            const useCase = new GetPermissionsUseCase(this.permissionRepository);
            const result = await useCase.execute();
            return res.status(result.code).json(result);
        }
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
