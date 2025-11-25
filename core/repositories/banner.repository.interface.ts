import { Banner, CreateBannerDTO, UpdateBannerDTO } from '../entities/banner.entity';

export interface IBannerRepository {
    findAll(): Promise<Banner[]>;
    findById(id: string): Promise<Banner | null>;
    findActive(): Promise<Banner[]>;
    create(data: CreateBannerDTO): Promise<Banner>;
    update(id: string, data: UpdateBannerDTO): Promise<Banner>;
    delete(id: string): Promise<void>;
    incrementImpressions(id: string): Promise<void>;
    incrementClicks(id: string): Promise<void>;
}
