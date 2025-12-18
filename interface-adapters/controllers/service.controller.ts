import { Request, Response } from 'express';
import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { CreateServiceUseCase } from '@/core/application/booking/create-service.use-case';
import { GetServicesUseCase } from '@/core/application/booking/get-services.use-case';
import { ILogger } from '@/core/providers/logger.interface';

export class ServiceController {
    private createServiceUseCase: CreateServiceUseCase;
    private getServicesUseCase: GetServicesUseCase;

    constructor(
        serviceRepository: IServiceRepository,
        private logger: ILogger
    ) {
        this.createServiceUseCase = new CreateServiceUseCase(serviceRepository, logger);
        this.getServicesUseCase = new GetServicesUseCase(serviceRepository, logger);
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
}
