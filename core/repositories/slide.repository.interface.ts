import { Slide, CreateSlideDTO, UpdateSlideDTO } from '@/entities/slide.entity';

export interface ISlideRepository {
    create(data: CreateSlideDTO): Promise<Slide>;
    update(id: string, data: UpdateSlideDTO): Promise<Slide>;
    findAll(): Promise<Slide[]>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<Slide | null>;
}
