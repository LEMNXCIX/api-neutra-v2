import { IBannerRepository } from "@/core/repositories/banner.repository.interface";
import { CreateBannerDTO } from "@/core/application/dtos/requests/banner.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { ValidationError } from "@/core/domain/errors/domain-errors";

export class CreateBannerUseCase {
    constructor(private bannerRepository: IBannerRepository) {}

    async execute(
        tenantId: string,
        data: CreateBannerDTO,
    ): Promise<UseCaseResult> {
        const startsAt = new Date(data.startsAt);
        const endsAt = new Date(data.endsAt);

        if (endsAt <= startsAt) {
            throw new ValidationError(
                "End date must be after start date",
                "INVALID_FORMAT",
            );
        }

        const banner = await this.bannerRepository.create(tenantId, data);
        return Success(banner, "Banner created successfully");
    }
}
