import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { IBannerRepository } from "@/core/repositories/banner.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class TrackBannerAnalyticsUseCase {
    constructor(private bannerRepository: IBannerRepository) {}

    async trackImpression(
        tenantId: string,
        id: string,
    ): Promise<UseCaseResult> {
        const banner = await this.bannerRepository.findById(tenantId, id);

        if (!banner) {
            throw new EntityNotFoundError("Banner", id);
        }

        await this.bannerRepository.incrementImpressions(tenantId, id);

        return Success(null, "Impression tracked");
    }

    async trackClick(tenantId: string, id: string): Promise<UseCaseResult> {
        const banner = await this.bannerRepository.findById(tenantId, id);

        if (!banner) {
            throw new EntityNotFoundError("Banner", id);
        }

        await this.bannerRepository.incrementClicks(tenantId, id);

        return Success(null, "Click tracked");
    }
}
