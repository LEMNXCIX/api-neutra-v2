import { Request, Response } from 'express';
import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';
import { CreateTenantUseCase } from '@/core/application/tenant/create-tenant.use-case';
import { GetTenantsUseCase } from '@/core/application/tenant/get-tenants.use-case';
import { GetTenantByIdUseCase } from '@/core/application/tenant/get-tenant-by-id.use-case';
import { GetTenantBySlugUseCase } from '@/core/application/tenant/get-tenant-by-slug.use-case';
import { UpdateTenantUseCase } from '@/core/application/tenant/update-tenant.use-case';
import { DeleteTenantUseCase } from '@/core/application/tenant/delete-tenant.use-case';
import { GetTenantFeaturesUseCase } from '@/core/application/tenant/get-tenant-features.use-case';
import { UpdateTenantFeaturesUseCase } from '@/core/application/tenant/update-tenant-features.use-case';
import { ILogger } from '@/core/providers/logger.interface';

export class TenantController {
    private createTenantUseCase: CreateTenantUseCase;
    private getTenantsUseCase: GetTenantsUseCase;
    private getTenantByIdUseCase: GetTenantByIdUseCase;
    private getTenantBySlugUseCase: GetTenantBySlugUseCase;
    private updateTenantUseCase: UpdateTenantUseCase;
    private deleteTenantUseCase: DeleteTenantUseCase;
    private getTenantFeaturesUseCase: GetTenantFeaturesUseCase;
    private updateTenantFeaturesUseCase: UpdateTenantFeaturesUseCase;

    constructor(
        private tenantRepository: ITenantRepository,
        private userRepository: IUserRepository,
        private logger: ILogger,
        private featureRepository: IFeatureRepository
    ) {
        this.createTenantUseCase = new CreateTenantUseCase(tenantRepository, userRepository, logger);
        this.getTenantsUseCase = new GetTenantsUseCase(tenantRepository, logger);
        this.getTenantByIdUseCase = new GetTenantByIdUseCase(tenantRepository, logger);
        this.getTenantBySlugUseCase = new GetTenantBySlugUseCase(tenantRepository, logger);
        this.updateTenantUseCase = new UpdateTenantUseCase(tenantRepository, logger);
        this.deleteTenantUseCase = new DeleteTenantUseCase(tenantRepository, logger);

        // Feature Use Cases
        this.getTenantFeaturesUseCase = new GetTenantFeaturesUseCase(featureRepository);
        this.updateTenantFeaturesUseCase = new UpdateTenantFeaturesUseCase(featureRepository);
    }

    async create(req: Request, res: Response) {
        const creatorId = (req as any).user?.id;
        if (!creatorId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const result = await this.createTenantUseCase.execute(req.body, creatorId);
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
        const tenantId = req.params.id || (req as any).tenantId;

        try {
            const features = await this.getTenantFeaturesUseCase.execute(tenantId);
            return res.status(200).json({
                success: true,
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
        const tenantId = (req.params as any).id;
        const features = req.body as Record<string, boolean>;

        try {
            await this.updateTenantFeaturesUseCase.execute(tenantId, features);
            return res.status(200).json({ success: true, message: 'Features updated' });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                code: 500,
                message: error.message
            });
        }
    }

    async delete(req: Request, res: Response) {
        const result = await this.deleteTenantUseCase.execute(req.params.id);
        return res.status(result.code).json(result);
    }
}
