
import { Request, Response } from 'express';
import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { CreateTenantUseCase } from '@/core/application/tenant/create-tenant.use-case';
import { GetTenantsUseCase } from '@/core/application/tenant/get-tenants.use-case';
import { GetTenantByIdUseCase } from '@/core/application/tenant/get-tenant-by-id.use-case';
import { GetTenantBySlugUseCase } from '@/core/application/tenant/get-tenant-by-slug.use-case';
import { UpdateTenantUseCase } from '@/core/application/tenant/update-tenant.use-case';
import { GetTenantFeaturesUseCase } from '@/core/application/tenant/get-tenant-features.use-case';
import { ILogger } from '@/core/providers/logger.interface';

export class TenantController {
    private createTenantUseCase: CreateTenantUseCase;
    private getTenantsUseCase: GetTenantsUseCase;
    private getTenantByIdUseCase: GetTenantByIdUseCase;
    private getTenantBySlugUseCase: GetTenantBySlugUseCase;
    private updateTenantUseCase: UpdateTenantUseCase;

    constructor(
        private tenantRepository: ITenantRepository,
        private logger: ILogger
    ) {
        this.createTenantUseCase = new CreateTenantUseCase(tenantRepository, logger);
        this.getTenantsUseCase = new GetTenantsUseCase(tenantRepository, logger);
        this.getTenantByIdUseCase = new GetTenantByIdUseCase(tenantRepository, logger);
        this.getTenantBySlugUseCase = new GetTenantBySlugUseCase(tenantRepository, logger);
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

    async getBySlug(req: Request, res: Response) {
        const result = await this.getTenantBySlugUseCase.execute(req.params.slug);
        return res.status(result.code).json(result);
    }

    async update(req: Request, res: Response) {
        const result = await this.updateTenantUseCase.execute(req.params.id, req.body);
        return res.status(result.code).json(result);
    }

    async getFeatures(req: Request, res: Response) {
        // We can reuse getById or use the new use case if we want strict separation
        // For now, let's reuse getById as it returns the entity which has config.features
        // But a dedicated use case is better for specific return type

        // Wait, I created GetTenantFeaturesUseCase! Let's use it.
        // I need to add it to generic properties.
        const useCase = new GetTenantFeaturesUseCase(this.tenantRepository);
        // Tenant ID might come from params or authenticated user's tenant
        // Assuming params for now or req.params.id
        const tenantId = req.params.id || (req as any).tenantId;

        try {
            const features = await useCase.execute(tenantId);
            return res.status(200).json({
                success: true,
                code: 200,
                message: 'Tenant features retrieved successfully',
                data: features
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                code: 500,
                message: error.message
            });
        }
    }

    async updateFeatures(req: Request, res: Response) {
        // We can use updateTenantUseCase but we want to patch config specifically
        // Or just use updateTenantUseCase if it handles deep merge or replacement
        // For now, let's assume updateTenantUseCase replaces config.

        const tenantId = req.params.id;
        const currentTenant = await this.tenantRepository.findById(tenantId);
        if (!currentTenant) {
            return res.status(404).json({ message: 'Tenant not found' });
        }

        const newConfig = {
            ...currentTenant.config,
            features: {
                ...currentTenant.config?.features,
                ...req.body
            }
        };

        const result = await this.updateTenantUseCase.execute(tenantId, { config: newConfig });
        return res.status(result.code).json(result);
    }
}

