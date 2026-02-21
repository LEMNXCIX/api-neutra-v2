import { Request, Response } from 'express';
import { IBannerRepository } from '@/core/repositories/banner.repository.interface';
import { CreateBannerUseCase } from '@/core/application/banners/create-banner.use-case';
import { GetBannersUseCase } from '@/core/application/banners/get-banners.use-case';
import { UpdateBannerUseCase } from '@/core/application/banners/update-banner.use-case';
import { DeleteBannerUseCase } from '@/core/application/banners/delete-banner.use-case';
import { TrackBannerAnalyticsUseCase } from '@/core/application/banners/track-banner-analytics.use-case';
import { GetBannerStatsUseCase } from '@/core/application/banners/get-banner-stats.use-case';

export class BannerController {
    constructor(
        private createBannerUseCase: CreateBannerUseCase,
        private getBannersUseCase: GetBannersUseCase,
        private updateBannerUseCase: UpdateBannerUseCase,
        private deleteBannerUseCase: DeleteBannerUseCase,
        private trackBannerAnalyticsUseCase: TrackBannerAnalyticsUseCase,
        private getBannerStatsUseCase: GetBannerStatsUseCase
    ) { }

    create = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.createBannerUseCase.execute(tenantId, req.body);
        return res.status(201).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        let tenantId = (req as any).tenantId;
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

        const result = await this.getBannersUseCase.execute(tenantId, false); // Get all banners
        return res.json(result);
    }

    getActive = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.getBannersUseCase.execute(tenantId, true); // Get only active banners
        return res.json(result);
    }

    getById = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.getBannersUseCase.executeById(tenantId, id);
        return res.json(result);
    }

    update = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.updateBannerUseCase.execute(tenantId, id, req.body);
        return res.json(result);
    }

    delete = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.deleteBannerUseCase.execute(tenantId, id);
        return res.json(result);
    }

    trackImpression = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.trackBannerAnalyticsUseCase.trackImpression(tenantId, id);
        return res.json(result);
    }

    trackClick = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.trackBannerAnalyticsUseCase.trackClick(tenantId, id);
        return res.json(result);
    }

    getStats = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.getBannerStatsUseCase.execute(tenantId);
        return res.json(result);
    }
}
