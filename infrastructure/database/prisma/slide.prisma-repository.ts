import { Slideshow as PrismaSlideshow, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import { ISlideRepository } from "@/core/repositories/slide.repository.interface";
import { Slideshow } from "@/core/entities/slide.entity";
import {
    CreateSlideshowDTO,
    UpdateSlideshowDTO,
} from "@/core/application/dtos/requests/slide.request";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class PrismaSlideRepository implements ISlideRepository {
    private mapToEntity(prismaSlide: PrismaSlideshow): Slideshow {
        return {
            id: prismaSlide.id,
            title: prismaSlide.title,
            img: prismaSlide.img,
            desc: prismaSlide.desc,
            active: prismaSlide.active,
            createdAt: prismaSlide.createdAt,
            updatedAt: prismaSlide.updatedAt,
        };
    }
    async create(
        tenantId: string,
        data: CreateSlideshowDTO,
    ): Promise<Slideshow> {
        const slide = await prisma.slideshow.create({
            data: {
                tenantId, // Assign tenant
                title: data.title,
                img: data.img,
                desc: data.desc,
                active: data.active ?? true,
            },
        });
        return this.mapToEntity(slide);
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateSlideshowDTO,
    ): Promise<Slideshow> {
        try {
            const slide = await prisma.slideshow.update({
                where: {
                    id,
                    tenantId,
                },
                data: {
                    title: data.title,
                    img: data.img,
                    desc: data.desc,
                    active: data.active,
                },
            });
            return this.mapToEntity(slide);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Slideshow", id);
            }
            throw error;
        }
    }

    async findAll(tenantId: string | undefined): Promise<Slideshow[]> {
        const slides = await prisma.slideshow.findMany({
            where: { ...(tenantId && { tenantId }) },
        });
        return slides.map((s) => this.mapToEntity(s));
    }

    async delete(tenantId: string, id: string): Promise<void> {
        try {
            await prisma.slideshow.delete({
                where: {
                    id,
                    tenantId,
                },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Slideshow", id);
            }
            throw error;
        }
    }

    async findById(tenantId: string, id: string): Promise<Slideshow | null> {
        const slide = await prisma.slideshow.findFirst({
            where: { id, tenantId },
        });
        return slide ? this.mapToEntity(slide) : null;
    }

    async getStats(tenantId: string): Promise<{
        totalSliders: number;
        activeSliders: number;
        withImages: number;
    }> {
        const [totalSliders, activeSliders, withImages] = await Promise.all([
            prisma.slideshow.count({ where: { tenantId } }),
            prisma.slideshow.count({ where: { tenantId, active: true } }),
            prisma.slideshow.count({ where: { tenantId, img: { not: "" } } }),
        ]);

        return {
            totalSliders,
            activeSliders,
            withImages,
        };
    }
}
