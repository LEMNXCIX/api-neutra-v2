import { Slideshow, CreateSlideshowDTO, UpdateSlideshowDTO } from '@/core/entities/slide.entity';

/**
 * Slideshow Repository Interface - Tenant-Scoped
 */
export interface ISlideRepository {
    create(tenantId: string, data: CreateSlideshowDTO): Promise<Slideshow>;
    update(tenantId: string, id: string, data: UpdateSlideshowDTO): Promise<Slideshow>;
    findAll(tenantId: string | undefined): Promise<Slideshow[]>;
    delete(tenantId: string, id: string): Promise<void>;
    findById(tenantId: string, id: string): Promise<Slideshow | null>;
    getStats(tenantId: string): Promise<{ totalSliders: number; activeSliders: number; withImages: number }>;
}
