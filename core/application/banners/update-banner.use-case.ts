import {
    IBannerRepository,
    BannerUpdateData,
} from "@/core/repositories/banner.repository.interface";
import { UpdateBannerDTO } from "@/core/application/dtos/requests/banner.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    ValidationError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

export class UpdateBannerUseCase {
    constructor(private bannerRepository: IBannerRepository) {}

    async execute(
        tenantId: string,
        id: string,
        data: UpdateBannerDTO,
    ): Promise<UseCaseResult> {
        if (data.startsAt && data.endsAt) {
            const startsAt = new Date(data.startsAt);
            const endsAt = new Date(data.endsAt);

            if (endsAt <= startsAt) {
                throw new ValidationError(
                    "End date must be after start date",
                    "INVALID_FORMAT",
                );
            }
        }

        const existingBanner = await this.bannerRepository.findById(
            tenantId,
            id,
        );
        if (!existingBanner) {
            throw new EntityNotFoundError("Banner", id);
        }

        const repoData: BannerUpdateData = {
            title: data.title,
            subtitle: data.subtitle,
            description: data.description,
            imageUrl: data.imageUrl,
            backgroundColor: data.backgroundColor,
            textColor: data.textColor,
            cta: data.cta,
            ctaUrl: data.ctaUrl,
            priority: data.priority,
            active: data.active,
            startsAt: data.startsAt,
            endsAt: data.endsAt,
        };
        const updatedBanner = await this.bannerRepository.update(
            tenantId,
            id,
            repoData,
        );
        return Success(updatedBanner, "Banner updated successfully");
    }
}
