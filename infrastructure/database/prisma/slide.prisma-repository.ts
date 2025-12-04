import { prisma } from '@/config/db.config';
import { ISlideRepository } from '@/core/repositories/slide.repository.interface';
import { Slideshow, CreateSlideshowDTO, UpdateSlideshowDTO } from '@/core/entities/slide.entity';

export class PrismaSlideRepository implements ISlideRepository {
    async create(data: CreateSlideshowDTO): Promise<Slideshow> {
        const slide = await prisma.slideshow.create({
            data: {
                title: data.title,
                img: data.img,
                desc: data.desc,
                active: data.active ?? true
            }
        });
        return this.mapToEntity(slide);
    }

    async update(id: string, data: UpdateSlideshowDTO): Promise<Slideshow> {
        const slide = await prisma.slideshow.update({
            where: { id },
            data: {
                title: data.title,
                img: data.img,
                desc: data.desc,
                active: data.active
            }
        });
        return this.mapToEntity(slide);
    }

    async findAll(): Promise<Slideshow[]> {
        const slides = await prisma.slideshow.findMany();
        return slides.map(this.mapToEntity);
    }

    async delete(id: string): Promise<void> {
        await prisma.slideshow.delete({
            where: { id }
        });
    }

    async findById(id: string): Promise<Slideshow | null> {
        const slide = await prisma.slideshow.findUnique({
            where: { id }
        });
        return slide ? this.mapToEntity(slide) : null;
    }

    async getStats(): Promise<{ totalSliders: number; activeSliders: number; withImages: number }> {
        const [totalSliders, activeSliders, withImages] = await Promise.all([
            prisma.slideshow.count(),
            prisma.slideshow.count({ where: { active: true } }),
            prisma.slideshow.count({ where: { img: { not: '' } } })
        ]);

        return {
            totalSliders,
            activeSliders,
            withImages
        };
    }

    private mapToEntity(prismaSlide: any): Slideshow {
        return {
            id: prismaSlide.id,
            title: prismaSlide.title,
            img: prismaSlide.img,
            desc: prismaSlide.desc,
            active: prismaSlide.active,
            createdAt: prismaSlide.createdAt,
            updatedAt: prismaSlide.updatedAt
        };
    }
}
