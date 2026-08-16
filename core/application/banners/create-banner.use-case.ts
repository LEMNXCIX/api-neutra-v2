import {
    IBannerRepository,
    BannerCreateData,
} from "@/core/repositories/banner.repository.interface";
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

        const repoData: BannerCreateData = {
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
        const banner = await this.bannerRepository.create(tenantId, repoData);
        return Success(banner, "Banner created successfully");
    }
}
