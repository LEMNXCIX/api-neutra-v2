import { Banner, CreateBannerDTO, UpdateBannerDTO } from '@/core/entities/banner.entity';

/**
 * Banner Repository Interface - Tenant-Scoped
 */
export interface IBannerRepository {
    findAll(tenantId: string): Promise<Banner[]>;
    findById(tenantId: string, id: string): Promise<Banner | null>;
    findActive(tenantId: string): Promise<Banner[]>;
    create(tenantId: string, data: CreateBannerDTO): Promise<Banner>;
    update(tenantId: string, id: string, data: UpdateBannerDTO): Promise<Banner>;
    delete(tenantId: string, id: string): Promise<void>;
    incrementImpressions(tenantId: string, id: string): Promise<void>;
    incrementClicks(tenantId: string, id: string): Promise<void>;
    getStats(tenantId: string): Promise<{ totalBanners: number; activeBanners: number }>;
}
