import { prisma } from '../../../config/db.config';
import { ISlideRepository } from '../../../core/repositories/slide.repository.interface';
import { Slide, CreateSlideDTO, UpdateSlideDTO } from '../../../core/entities/slide.entity';

export class PrismaSlideRepository implements ISlideRepository {
    async create(data: CreateSlideDTO): Promise<Slide> {
        const slide = await prisma.slideshow.create({
            data: {
                title: data.title,
                img: data.img,
                desc: data.desc
            }
        });
        return this.mapToEntity(slide);
    }

    async update(id: string, data: UpdateSlideDTO): Promise<Slide> {
        const slide = await prisma.slideshow.update({
            where: { id },
            data: {
                title: data.title,
                img: data.img,
                desc: data.desc
            }
        });
        return this.mapToEntity(slide);
    }

    async findAll(): Promise<Slide[]> {
        const slides = await prisma.slideshow.findMany();
        return slides.map(this.mapToEntity);
    }

    async delete(id: string): Promise<void> {
        await prisma.slideshow.delete({
            where: { id }
        });
    }

    async findById(id: string): Promise<Slide | null> {
        const slide = await prisma.slideshow.findUnique({
            where: { id }
        });
        return slide ? this.mapToEntity(slide) : null;
    }

    private mapToEntity(prismaSlide: any): Slide {
        return {
            id: prismaSlide.id,
            title: prismaSlide.title,
            img: prismaSlide.img,
            desc: prismaSlide.desc,
            createdAt: prismaSlide.createdAt,
            updatedAt: prismaSlide.updatedAt
        };
    }
}
