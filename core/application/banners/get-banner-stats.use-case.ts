import type { IBannerRepository } from "@/core/repositories/banner.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetBannerStatsUseCase {
    constructor(private bannerRepository: IBannerRepository) {}

    async execute(tenantId: string): Promise<UseCaseResult> {
        const stats = await this.bannerRepository.getStats(tenantId);
        return Success(stats, "Banner stats retrieved successfully");
    }
}
