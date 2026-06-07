import { Request, Response } from "express";
import { CreateTenantUseCase } from "@/core/application/tenant/create-tenant.use-case";
import { GetTenantsUseCase } from "@/core/application/tenant/get-tenants.use-case";
import { GetTenantByIdUseCase } from "@/core/application/tenant/get-tenant-by-id.use-case";
import { GetTenantBySlugUseCase } from "@/core/application/tenant/get-tenant-by-slug.use-case";
import { UpdateTenantUseCase } from "@/core/application/tenant/update-tenant.use-case";
import { DeleteTenantUseCase } from "@/core/application/tenant/delete-tenant.use-case";
import { GetTenantFeaturesUseCase } from "@/core/application/tenant/get-tenant-features.use-case";
import { UpdateTenantFeaturesUseCase } from "@/core/application/tenant/update-tenant-features.use-case";
import { TenantPresenter } from "@/core/presenters/tenant.presenter";
import { present } from "@/core/utils/use-case-result";
import { AppError } from "@/types/api-response";
import { AuthErrorCodes } from "@/types/error-codes";

export class TenantController {
    constructor(
        private createTenantUseCase: CreateTenantUseCase,
        private getTenantsUseCase: GetTenantsUseCase,
        private getTenantByIdUseCase: GetTenantByIdUseCase,
        private getTenantBySlugUseCase: GetTenantBySlugUseCase,
        private updateTenantUseCase: UpdateTenantUseCase,
        private deleteTenantUseCase: DeleteTenantUseCase,
        private getTenantFeaturesUseCase: GetTenantFeaturesUseCase,
        private updateTenantFeaturesUseCase: UpdateTenantFeaturesUseCase,
    ) {}

    async create(req: Request, res: Response) {
        const creatorId = req.user?.id;
        if (!creatorId) {
            throw new AppError(
                "Unauthorized",
                401,
                AuthErrorCodes.UNAUTHORIZED,
            );
        }
        const result = await this.createTenantUseCase.execute(
            req.body,
            creatorId,
        );
        return res
            .status(201)
            .json(present(result, TenantPresenter.toResponse));
    }

    async getAll(req: Request, res: Response) {
        const result = await this.getTenantsUseCase.execute();
        return res.json(present(result, TenantPresenter.toResponseList));
    }

    async getById(req: Request, res: Response) {
        const result = await this.getTenantByIdUseCase.execute(req.params.id);
        return res.json(present(result, TenantPresenter.toResponse));
    }

    async getBySlug(req: Request, res: Response) {
        const result = await this.getTenantBySlugUseCase.execute(
            req.params.slug,
        );
        return res.json(present(result, TenantPresenter.toResponse));
    }

    async update(req: Request, res: Response) {
        const result = await this.updateTenantUseCase.execute(
            req.params.id,
            req.body,
        );
        return res.json(present(result, TenantPresenter.toResponse));
    }

    async getFeatures(req: Request, res: Response) {
        const tenantId = req.params.id || req.tenantId!;
        const result = await this.getTenantFeaturesUseCase.execute(tenantId);
        return res.json(result);
    }

    async updateFeatures(req: Request, res: Response) {
        const tenantId = req.params.id;
        const features = req.body as Record<string, boolean>;
        const result = await this.updateTenantFeaturesUseCase.execute(
            tenantId,
            { features },
        );
        return res.json(result);
    }

    async delete(req: Request, res: Response) {
        const result = await this.deleteTenantUseCase.execute(req.params.id);
        return res.json(result);
    }
}
