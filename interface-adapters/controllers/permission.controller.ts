import { Request, Response } from 'express';
import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { CreatePermissionUseCase } from '@/core/application/permissions/create-permission.use-case';
import { GetPermissionsUseCase } from '@/core/application/permissions/get-permissions.use-case';
import { UpdatePermissionUseCase } from '@/core/application/permissions/update-permission.use-case';
import { DeletePermissionUseCase } from '@/core/application/permissions/delete-permission.use-case';
import { GetPermissionsPaginatedUseCase } from '@/core/application/permissions/get-permissions-paginated.use-case';

export class PermissionController {
    constructor(
        private createPermissionUseCase: CreatePermissionUseCase,
        private getPermissionsUseCase: GetPermissionsUseCase,
        private updatePermissionUseCase: UpdatePermissionUseCase,
        private deletePermissionUseCase: DeletePermissionUseCase,
        private getPermissionsPaginatedUseCase: GetPermissionsPaginatedUseCase
    ) { }

    create = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.createPermissionUseCase.execute(tenantId, req.body);
        return res.status(201).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const page = req.query.page ? parseInt(req.query.page as string) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        const search = req.query.search ? (req.query.search as string) : undefined;

        if (page || limit || search) {
            const result = await this.getPermissionsPaginatedUseCase.execute(tenantId, page, limit, search);
            return res.json(result);
        } else {
            const result = await this.getPermissionsUseCase.execute(tenantId);
            return res.json(result);
        }
    }

    getById = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.getPermissionsUseCase.executeById(tenantId, id);
        return res.json(result);
    }

    update = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.updatePermissionUseCase.execute(tenantId, id, req.body);
        return res.json(result);
    }

    delete = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.deletePermissionUseCase.execute(tenantId, id);
        return res.json(result);
    }
}
