import { prisma } from '@/config/db.config';
import { ISlideRepository } from '@/core/repositories/slide.repository.interface';
import { Slideshow, CreateSlideshowDTO, UpdateSlideshowDTO } from '@/core/entities/slide.entity';

/**
 * Tenant-Aware Slideshow Repository
 */
export class PrismaSlideRepository implements ISlideRepository {
    async create(tenantId: string, data: CreateSlideshowDTO): Promise<Slideshow> {
        const slide = await prisma.slideshow.create({
            data: {
                tenantId, // Assign tenant
                title: data.title,
                img: data.img,
                desc: data.desc,
                active: data.active ?? true
            }
        });
        return this.mapToEntity(slide);
    }

    async update(tenantId: string, id: string, data: UpdateSlideshowDTO): Promise<Slideshow> {
        const slide = await prisma.slideshow.update({
            where: {
                id,
                tenantId // Ensure ownership
            },
            data: {
                title: data.title,
                img: data.img,
                desc: data.desc,
                active: data.active
            }
        });
        return this.mapToEntity(slide);
    }

    async findAll(tenantId: string): Promise<Slideshow[]> {
        const slides = await prisma.slideshow.findMany({
            where: { tenantId }
        });
        return slides.map(this.mapToEntity);
    }

    async delete(tenantId: string, id: string): Promise<void> {
        await prisma.slideshow.delete({
            where: {
                id,
                tenantId
            }
        });
    }

    async findById(tenantId: string, id: string): Promise<Slideshow | null> {
        const slide = await prisma.slideshow.findFirst({
            where: { id, tenantId }
        });
        return slide ? this.mapToEntity(slide) : null;
    }

    async getStats(tenantId: string): Promise<{ totalSliders: number; activeSliders: number; withImages: number }> {
        const [totalSliders, activeSliders, withImages] = await Promise.all([
            prisma.slideshow.count({ where: { tenantId } }),
            prisma.slideshow.count({ where: { tenantId, active: true } }),
            prisma.slideshow.count({ where: { tenantId, img: { not: '' } } })
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
