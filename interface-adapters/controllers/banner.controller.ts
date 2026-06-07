import { Request, Response } from "express";
import { CreateBannerUseCase } from "@/core/application/banners/create-banner.use-case";
import { GetBannersUseCase } from "@/core/application/banners/get-banners.use-case";
import { UpdateBannerUseCase } from "@/core/application/banners/update-banner.use-case";
import { DeleteBannerUseCase } from "@/core/application/banners/delete-banner.use-case";
import { TrackBannerAnalyticsUseCase } from "@/core/application/banners/track-banner-analytics.use-case";
import { GetBannerStatsUseCase } from "@/core/application/banners/get-banner-stats.use-case";
import { BannerPresenter } from "@/core/presenters/banner.presenter";
import { present } from "@/core/utils/use-case-result";

export class BannerController {
    constructor(
        private createBannerUseCase: CreateBannerUseCase,
        private getBannersUseCase: GetBannersUseCase,
        private updateBannerUseCase: UpdateBannerUseCase,
        private deleteBannerUseCase: DeleteBannerUseCase,
        private trackBannerAnalyticsUseCase: TrackBannerAnalyticsUseCase,
        private getBannerStatsUseCase: GetBannerStatsUseCase,
    ) {}

    create = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.createBannerUseCase.execute(
            tenantId,
            req.body,
        );
        return res
            .status(201)
            .json(present(result, BannerPresenter.toResponse));
    };

    getAll = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;

        const result = await this.getBannersUseCase.execute(tenantId, false);
        return res.json(present(result, BannerPresenter.toResponseList));
    };

    getActive = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.getBannersUseCase.execute(tenantId, true); // Get only active banners
        return res.json(present(result, BannerPresenter.toResponseList));
    };

    getById = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.getBannersUseCase.executeById(tenantId, id);
        return res.json(present(result, BannerPresenter.toResponse));
    };

    update = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateBannerUseCase.execute(
            tenantId,
            id,
            req.body,
        );
        return res.json(present(result, BannerPresenter.toResponse));
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deleteBannerUseCase.execute(tenantId, id);
        return res.json(result);
    };

    trackImpression = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.trackBannerAnalyticsUseCase.trackImpression(
            tenantId,
            id,
        );
        return res.json(result);
    };

    trackClick = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.trackBannerAnalyticsUseCase.trackClick(
            tenantId,
            id,
        );
        return res.json(result);
    };

    getStats = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.getBannerStatsUseCase.execute(tenantId);
        return res.json(result);
    };
}
