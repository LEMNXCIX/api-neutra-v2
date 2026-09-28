import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { IBannerRepository } from "@/core/repositories/banner.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class DeleteBannerUseCase {
    constructor(private bannerRepository: IBannerRepository) {}

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const banner = await this.bannerRepository.findById(tenantId, id);

        if (!banner) {
            throw new EntityNotFoundError("Banner", id);
        }

        await this.bannerRepository.delete(tenantId, id);

        return Success(null, "Banner deleted successfully");
    }
}
