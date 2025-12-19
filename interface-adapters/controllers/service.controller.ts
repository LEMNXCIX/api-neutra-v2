import { Request, Response } from 'express';
import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { CreateServiceUseCase } from '@/core/application/booking/create-service.use-case';
import { GetServicesUseCase } from '@/core/application/booking/get-services.use-case';
import { UpdateServiceUseCase } from '@/core/application/booking/update-service.use-case';
import { DeleteServiceUseCase } from '@/core/application/booking/delete-service.use-case';
import { ILogger } from '@/core/providers/logger.interface';

export class ServiceController {
    private createServiceUseCase: CreateServiceUseCase;
    private getServicesUseCase: GetServicesUseCase;
    private updateServiceUseCase: UpdateServiceUseCase;
    private deleteServiceUseCase: DeleteServiceUseCase;

    constructor(
        serviceRepository: IServiceRepository,
        categoryRepository: ICategoryRepository,
        private logger: ILogger
    ) {
        this.createServiceUseCase = new CreateServiceUseCase(serviceRepository, categoryRepository, logger);
        this.getServicesUseCase = new GetServicesUseCase(serviceRepository, logger);
        this.updateServiceUseCase = new UpdateServiceUseCase(serviceRepository, categoryRepository, logger);
        this.deleteServiceUseCase = new DeleteServiceUseCase(serviceRepository, logger);
    }

    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const result = await this.createServiceUseCase.execute(tenantId, req.body);
        return res.status(result.code).json(result);
    }

    async getAll(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const activeOnly = req.query.activeOnly !== 'false';
        const result = await this.getServicesUseCase.execute(tenantId, activeOnly);
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
