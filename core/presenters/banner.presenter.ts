import {
    BannerResponse,
    IBannerResponse,
} from "@/core/application/dtos/responses/banner/banner.response";

export class BannerPresenter {
    static toResponse(banner: any): IBannerResponse {
        return BannerResponse.fromEntity(banner);
    }

    static toResponseList(banners: any[]): IBannerResponse[] {
        return banners.map((b) => BannerResponse.fromEntity(b));
    }
}
