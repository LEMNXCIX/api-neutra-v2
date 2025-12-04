import { Slideshow, CreateSlideshowDTO, UpdateSlideshowDTO } from '@/core/entities/slide.entity';

export interface ISlideRepository {
    create(data: CreateSlideshowDTO): Promise<Slideshow>;
    update(id: string, data: UpdateSlideshowDTO): Promise<Slideshow>;
    findAll(): Promise<Slideshow[]>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<Slideshow | null>;
    getStats(): Promise<{ totalSliders: number; activeSliders: number; withImages: number }>;
}
