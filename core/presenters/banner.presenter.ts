import { Banner } from "@/core/entities/banner.entity";
import {
    BannerResponse,
    IBannerResponse,
} from "@/core/application/dtos/responses/banner/banner.response";

export class BannerPresenter {
    static toResponse(banner: Banner): IBannerResponse {
        return BannerResponse.fromEntity(banner);
    }

    static toResponseList(banners: Banner[]): IBannerResponse[] {
        if (!Array.isArray(banners)) return [];
        return banners.map((b) => BannerResponse.fromEntity(b));
    }
}
