import { Banner } from "@/core/entities/banner.entity";

export type BannerCreateData = {
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    cta?: string;
    ctaUrl?: string;
    priority?: number;
    active?: boolean;
    startsAt: Date | string;
    endsAt: Date | string;
};

export type BannerUpdateData = {
    title?: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    cta?: string;
    ctaUrl?: string;
    priority?: number;
    active?: boolean;
    startsAt?: Date | string;
    endsAt?: Date | string;
};

/**
 * Banner Repository Interface - Tenant-Scoped
 */
export interface IBannerRepository {
    findAll(tenantId: string | undefined): Promise<Banner[]>;
    findById(tenantId: string, id: string): Promise<Banner | null>;
    findActive(tenantId: string | undefined): Promise<Banner[]>;
    create(tenantId: string, data: BannerCreateData): Promise<Banner>;
    update(
        tenantId: string,
        id: string,
        data: BannerUpdateData,
    ): Promise<Banner>;
    delete(tenantId: string, id: string): Promise<void>;
    incrementImpressions(tenantId: string, id: string): Promise<void>;
    incrementClicks(tenantId: string, id: string): Promise<void>;
    getStats(
        tenantId: string,
    ): Promise<{ totalBanners: number; activeBanners: number }>;
}
