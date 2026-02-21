import { Request, Response } from 'express';
import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { CreateServiceUseCase } from '@/core/application/booking/create-service.use-case';
import { GetServicesUseCase } from '@/core/application/booking/get-services.use-case';
import { UpdateServiceUseCase } from '@/core/application/booking/update-service.use-case';
import { DeleteServiceUseCase } from '@/core/application/booking/delete-service.use-case';
import { ILogger } from '@/core/providers/logger.interface';

export class ServiceController {
    constructor(
        private createServiceUseCase: CreateServiceUseCase,
        private getServicesUseCase: GetServicesUseCase,
        private updateServiceUseCase: UpdateServiceUseCase,
        private deleteServiceUseCase: DeleteServiceUseCase
    ) { }

    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result = await this.createServiceUseCase.execute(tenantId, req.body);
        return res.status(result.code).json(result);
    }

    async getAll(req: Request, res: Response) {
        let tenantId = req.tenantId;
        const user = (req as any).user;

        // Super Admin Bypass
        if (user && user.role && user.role.name === 'SUPER_ADMIN') {
            if (req.query.tenantId) {
                tenantId = req.query.tenantId as string;
                if (tenantId === 'all') tenantId = undefined;
            }
        } else if (!tenantId) {
            return res.status(400).json({ success: false, message: "Tenant ID required" });
        }

        const activeOnly = req.query.activeOnly !== 'false';
        const result = await this.getServicesUseCase.execute(tenantId!, activeOnly);
        return res.status(result.code).json(result);
    }

    async update(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateServiceUseCase.execute(tenantId, id, req.body);
        return res.status(result.code).json(result);
    }

    async delete(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deleteServiceUseCase.execute(tenantId, id);
        return res.status(result.code).json(result);
    }
}
