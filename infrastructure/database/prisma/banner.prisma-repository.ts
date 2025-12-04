import { prisma } from '@/config/db.config';
import { IBannerRepository } from '@/core/repositories/banner.repository.interface';
import { Banner, CreateBannerDTO, UpdateBannerDTO } from '@/core/entities/banner.entity';

export class PrismaBannerRepository implements IBannerRepository {

    async findAll(): Promise<Banner[]> {

        const banners = await prisma.banner.findMany(
            {
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'desc' }
                ]
            });

        return banners as Banner[];
    }

    async findById(id: string): Promise<Banner | null> {
        const banner = await prisma.banner.findUnique({
            where: { id }
        });
        return banner as Banner | null;
    }

    async findActive(): Promise<Banner[]> {
        const now = new Date();
        const banners = await prisma.banner.findMany({
            where: {
                active: true,
                startsAt: { lte: now },
                endsAt: { gte: now }
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ]
        });
        return banners as Banner[];
    }

    async create(data: CreateBannerDTO): Promise<Banner> {
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
                priority: data.priority ?? 0,
                active: data.active ?? true,
                startsAt: new Date(data.startsAt),
                endsAt: new Date(data.endsAt)
            }
        });
        return banner as Banner;
    }

    async update(id: string, data: UpdateBannerDTO): Promise<Banner> {
        const updateData: any = { ...data };

        if (data.startsAt) {
            updateData.startsAt = new Date(data.startsAt);
        }
        if (data.endsAt) {
            updateData.endsAt = new Date(data.endsAt);
        }

        const banner = await prisma.banner.update({
            where: { id },
            data: updateData
        });
        return banner as Banner;
    }

    async delete(id: string): Promise<void> {
        await prisma.banner.delete({
            where: { id }
        });
    }

    async incrementImpressions(id: string): Promise<void> {
        await prisma.banner.update({
            where: { id },
            data: {
                impressions: {
                    increment: 1
                }
            }
        });
    }

    async incrementClicks(id: string): Promise<void> {
        await prisma.banner.update({
            where: { id },
            data: {
                clicks: {
                    increment: 1
                }
            }
        });
    }

    async getStats(): Promise<{ totalBanners: number; activeBanners: number }> {
        const now = new Date();
        const [totalBanners, activeBanners] = await Promise.all([
            prisma.banner.count(),
            prisma.banner.count({
                where: {
                    active: true,
                    startsAt: { lte: now },
                    endsAt: { gte: now }
                }
            })
        ]);

        return {
            totalBanners,
            activeBanners
        };
    }
}
