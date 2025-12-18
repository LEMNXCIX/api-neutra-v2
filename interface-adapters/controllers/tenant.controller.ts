
import { Request, Response } from 'express';
import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { CreateTenantUseCase } from '@/core/application/tenant/create-tenant.use-case';
import { GetTenantsUseCase } from '@/core/application/tenant/get-tenants.use-case';
import { GetTenantByIdUseCase } from '@/core/application/tenant/get-tenant-by-id.use-case';
import { UpdateTenantUseCase } from '@/core/application/tenant/update-tenant.use-case';
import { ILogger } from '@/core/providers/logger.interface';

export class TenantController {
    private createTenantUseCase: CreateTenantUseCase;
    private getTenantsUseCase: GetTenantsUseCase;
    private getTenantByIdUseCase: GetTenantByIdUseCase;
    private updateTenantUseCase: UpdateTenantUseCase;

    constructor(
        private tenantRepository: ITenantRepository,
        private logger: ILogger
    ) {
        this.createTenantUseCase = new CreateTenantUseCase(tenantRepository, logger);
        this.getTenantsUseCase = new GetTenantsUseCase(tenantRepository, logger);
        this.getTenantByIdUseCase = new GetTenantByIdUseCase(tenantRepository, logger);
        this.updateTenantUseCase = new UpdateTenantUseCase(tenantRepository, logger);
    }

    async create(req: Request, res: Response) {
        const result = await this.createTenantUseCase.execute(req.body);
        return res.status(result.code).json(result);
    }

    async getAll(req: Request, res: Response) {
        const result = await this.getTenantsUseCase.execute();
        return res.status(result.code).json(result);
    }

    async getById(req: Request, res: Response) {
        const result = await this.getTenantByIdUseCase.execute(req.params.id);
        return res.status(result.code).json(result);
    }

    async update(req: Request, res: Response) {
        const result = await this.updateTenantUseCase.execute(req.params.id, req.body);
        return res.status(result.code).json(result);
    }
}

