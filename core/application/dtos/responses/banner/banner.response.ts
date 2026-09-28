import type { Banner } from "@/core/entities/banner.entity";

export interface IBannerResponse {
    id: string;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    backgroundColor?: string | null;
    textColor?: string | null;
    cta?: string | null;
    ctaUrl?: string | null;
    priority: number;
    active: boolean;
    startsAt: Date;
    endsAt: Date;
    impressions: number;
    clicks: number;
    createdAt: Date;
    updatedAt: Date;
}

export class BannerResponse {
    static fromEntity(banner: Banner): IBannerResponse {
        return {
            id: banner.id,
            title: banner.title,
            subtitle: banner.subtitle,
            description: banner.description,
            imageUrl: banner.imageUrl,
            backgroundColor: banner.backgroundColor,
            textColor: banner.textColor,
            cta: banner.cta,
            ctaUrl: banner.ctaUrl,
            priority: banner.priority,
            active: banner.active,
            startsAt: banner.startsAt,
            endsAt: banner.endsAt,
            impressions: banner.impressions,
            clicks: banner.clicks,
            createdAt: banner.createdAt,
            updatedAt: banner.updatedAt,
        };
    }
}
