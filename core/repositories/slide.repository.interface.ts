import { Slideshow } from "@/core/entities/slide.entity";

export type SlideshowCreateData = {
    title: string;
    img: string;
    desc?: string;
    active?: boolean;
};

export type SlideshowUpdateData = {
    title?: string;
    img?: string;
    desc?: string;
    active?: boolean;
};

/**
 * Slideshow Repository Interface - Tenant-Scoped
 */
export interface ISlideRepository {
    create(tenantId: string, data: SlideshowCreateData): Promise<Slideshow>;
    update(
        tenantId: string,
        id: string,
        data: SlideshowUpdateData,
    ): Promise<Slideshow>;
    findAll(tenantId: string | undefined): Promise<Slideshow[]>;
    delete(tenantId: string, id: string): Promise<void>;
    findById(tenantId: string, id: string): Promise<Slideshow | null>;
    getStats(tenantId: string): Promise<{
        totalSliders: number;
        activeSliders: number;
        withImages: number;
    }>;
}
