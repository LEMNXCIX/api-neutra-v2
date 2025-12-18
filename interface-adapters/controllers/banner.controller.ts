import { Request, Response } from 'express';
import { IBannerRepository } from '@/core/repositories/banner.repository.interface';
import { CreateBannerUseCase } from '@/core/application/banners/create-banner.use-case';
import { GetBannersUseCase } from '@/core/application/banners/get-banners.use-case';
import { UpdateBannerUseCase } from '@/core/application/banners/update-banner.use-case';
import { DeleteBannerUseCase } from '@/core/application/banners/delete-banner.use-case';
import { TrackBannerAnalyticsUseCase } from '@/core/application/banners/track-banner-analytics.use-case';
import { GetBannerStatsUseCase } from '@/core/application/banners/get-banner-stats.use-case';

export class BannerController {
    constructor(private bannerRepository: IBannerRepository) { }

    create = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const useCase = new CreateBannerUseCase(this.bannerRepository);
        const result = await useCase.execute(tenantId, req.body);
        return res.status(result.code).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const useCase = new GetBannersUseCase(this.bannerRepository);
        const result = await useCase.execute(tenantId, false); // Get all banners
        return res.status(result.code).json(result);
    }

    getActive = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const useCase = new GetBannersUseCase(this.bannerRepository);
        const result = await useCase.execute(tenantId, true); // Get only active banners
        return res.status(result.code).json(result);
    }

    getById = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new GetBannersUseCase(this.bannerRepository);
        const result = await useCase.executeById(tenantId, id);
        return res.status(result.code).json(result);
    }

    update = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new UpdateBannerUseCase(this.bannerRepository);
        const result = await useCase.execute(tenantId, id, req.body);
        return res.status(result.code).json(result);
    }

    delete = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new DeleteBannerUseCase(this.bannerRepository);
        const result = await useCase.execute(tenantId, id);
        return res.status(result.code).json(result);
    }

    trackImpression = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new TrackBannerAnalyticsUseCase(this.bannerRepository);
        const result = await useCase.trackImpression(tenantId, id);
        return res.status(result.code).json(result);
    }

    trackClick = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new TrackBannerAnalyticsUseCase(this.bannerRepository);
        const result = await useCase.trackClick(tenantId, id);
        return res.status(result.code).json(result);
    }

    getStats = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const useCase = new GetBannerStatsUseCase(this.bannerRepository);
        const result = await useCase.execute(tenantId);
        return res.status(result.code).json(result);
    }
}
