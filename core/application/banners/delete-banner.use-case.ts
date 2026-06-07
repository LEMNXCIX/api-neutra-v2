import { IBannerRepository } from "@/core/repositories/banner.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

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
