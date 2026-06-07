import { IBannerRepository } from "@/core/repositories/banner.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class GetBannersUseCase {
    constructor(private bannerRepository: IBannerRepository) {}

    async execute(
        tenantId: string | undefined,
        activeOnly: boolean = false,
    ): Promise<UseCaseResult> {
        const banners = activeOnly
            ? await this.bannerRepository.findActive(tenantId)
            : await this.bannerRepository.findAll(tenantId);

        return Success(banners, "Banners retrieved successfully");
    }

    async executeById(tenantId: string, id: string): Promise<UseCaseResult> {
        const banner = await this.bannerRepository.findById(tenantId, id);

        if (!banner) {
            throw new EntityNotFoundError("Banner", id);
        }

        return Success(banner, "Banner retrieved successfully");
    }
}
