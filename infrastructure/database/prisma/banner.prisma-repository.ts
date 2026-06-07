import { Banner as PrismaBanner, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import { IBannerRepository } from "@/core/repositories/banner.repository.interface";
import { Banner } from "@/core/entities/banner.entity";
import {
    CreateBannerDTO,
    UpdateBannerDTO,
} from "@/core/application/dtos/requests/banner.request";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

export class PrismaBannerRepository implements IBannerRepository {
    private mapToEntity(data: PrismaBanner): Banner {
        return {
            id: data.id,
            title: data.title,
            subtitle: data.subtitle ?? undefined,
            description: data.description ?? undefined,
            imageUrl: data.imageUrl ?? undefined,
            backgroundColor: data.backgroundColor ?? undefined,
            textColor: data.textColor ?? undefined,
            cta: data.cta ?? undefined,
            ctaUrl: data.ctaUrl ?? undefined,
            priority: data.priority,
            active: data.active,
            startsAt: data.startsAt,
            endsAt: data.endsAt,
            impressions: data.impressions,
            clicks: data.clicks,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    }

    async findAll(tenantId: string | undefined): Promise<Banner[]> {
        const banners = await prisma.banner.findMany({
            where: { ...(tenantId && { tenantId }) },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        });

        return banners.map(this.mapToEntity);
    }

    async findById(tenantId: string, id: string): Promise<Banner | null> {
        const banner = await prisma.banner.findFirst({
            where: { id, tenantId },
        });
        return banner ? this.mapToEntity(banner) : null;
    }

    async findActive(tenantId: string | undefined): Promise<Banner[]> {
        const now = new Date();
        const banners = await prisma.banner.findMany({
            where: {
                ...(tenantId && { tenantId }),
                active: true,
                startsAt: { lte: now },
                endsAt: { gte: now },
            },
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        });
        return banners.map(this.mapToEntity);
    }

    async create(tenantId: string, data: CreateBannerDTO): Promise<Banner> {
        try {
            const banner = await prisma.banner.create({
                data: {
                    title: data.title,
                    subtitle: data.subtitle,
                    description: data.description,
                    imageUrl: data.imageUrl,
                    backgroundColor: data.backgroundColor,
                    textColor: data.textColor,
                    cta: data.cta,
                    ctaUrl: data.ctaUrl,
                    tenantId,
                    priority: data.priority ?? 0,
                    active: data.active ?? true,
                    startsAt: new Date(data.startsAt),
                    endsAt: new Date(data.endsAt),
                },
            });
            return this.mapToEntity(banner);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "id";
                throw new DuplicateEntityError("Banner", target, data.title);
            }
            throw error;
        }
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateBannerDTO,
    ): Promise<Banner> {
        const updateData: Prisma.BannerUpdateInput = {};

        if (data.title !== undefined) updateData.title = data.title;
        if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
        if (data.backgroundColor !== undefined)
            updateData.backgroundColor = data.backgroundColor;
        if (data.textColor !== undefined) updateData.textColor = data.textColor;
        if (data.cta !== undefined) updateData.cta = data.cta;
        if (data.ctaUrl !== undefined) updateData.ctaUrl = data.ctaUrl;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.active !== undefined) updateData.active = data.active;
        if (data.startsAt !== undefined)
            updateData.startsAt = new Date(data.startsAt);
        if (data.endsAt !== undefined)
            updateData.endsAt = new Date(data.endsAt);

        try {
            const banner = await prisma.banner.update({
                where: { id, tenantId },
                data: updateData,
            });
            return this.mapToEntity(banner);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Banner", id);
            }
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "id";
                throw new DuplicateEntityError(
                    "Banner",
                    target,
                    data.title ?? "",
                );
            }
            throw error;
        }
    }

    async delete(tenantId: string, id: string): Promise<void> {
        try {
            await prisma.banner.delete({
                where: { id, tenantId },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Banner", id);
            }
            throw error;
        }
    }

    async incrementImpressions(tenantId: string, id: string): Promise<void> {
        await prisma.banner.update({
            where: { id, tenantId },
            data: {
                impressions: { increment: 1 },
            },
        });
    }

    async incrementClicks(tenantId: string, id: string): Promise<void> {
        await prisma.banner.update({
            where: { id, tenantId },
            data: {
                clicks: { increment: 1 },
            },
        });
    }

    async getStats(
        tenantId: string,
    ): Promise<{ totalBanners: number; activeBanners: number }> {
        const now = new Date();
        const [totalBanners, activeBanners] = await Promise.all([
            prisma.banner.count({ where: { tenantId } }),
            prisma.banner.count({
                where: {
                    tenantId,
                    active: true,
                    startsAt: { lte: now },
                    endsAt: { gte: now },
                },
            }),
        ]);

        return {
            totalBanners,
            activeBanners,
        };
    }
}
