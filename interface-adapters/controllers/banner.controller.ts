import { Request, Response } from 'express';
import { IBannerRepository } from '@/core/repositories/banner.repository.interface';
import { CreateBannerUseCase } from '@/use-cases/banners/create-banner.use-case';
import { GetBannersUseCase } from '@/use-cases/banners/get-banners.use-case';
import { UpdateBannerUseCase } from '@/use-cases/banners/update-banner.use-case';
import { DeleteBannerUseCase } from '@/use-cases/banners/delete-banner.use-case';
import { TrackBannerAnalyticsUseCase } from '@/use-cases/banners/track-banner-analytics.use-case';

export class BannerController {
    constructor(private bannerRepository: IBannerRepository) { }

    create = async (req: Request, res: Response) => {
        const useCase = new CreateBannerUseCase(this.bannerRepository);
        const result = await useCase.execute(req.body);
        return res.status(result.code).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const useCase = new GetBannersUseCase(this.bannerRepository);
        const result = await useCase.execute(false); // Get all banners
        return res.status(result.code).json(result);
    }

    getActive = async (req: Request, res: Response) => {
        const useCase = new GetBannersUseCase(this.bannerRepository);
        const result = await useCase.execute(true); // Get only active banners
        return res.status(result.code).json(result);
    }

    getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new GetBannersUseCase(this.bannerRepository);
        const result = await useCase.executeById(id);
        return res.status(result.code).json(result);
    }

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new UpdateBannerUseCase(this.bannerRepository);
        const result = await useCase.execute(id, req.body);
        return res.status(result.code).json(result);
    }

    delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new DeleteBannerUseCase(this.bannerRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }

    trackImpression = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new TrackBannerAnalyticsUseCase(this.bannerRepository);
        const result = await useCase.trackImpression(id);
        return res.status(result.code).json(result);
    }

    trackClick = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new TrackBannerAnalyticsUseCase(this.bannerRepository);
        const result = await useCase.trackClick(id);
        return res.status(result.code).json(result);
    }
}
