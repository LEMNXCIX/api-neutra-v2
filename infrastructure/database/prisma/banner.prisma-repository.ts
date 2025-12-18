import { prisma } from '@/config/db.config';
import { IBannerRepository } from '@/core/repositories/banner.repository.interface';
import { Banner, CreateBannerDTO, UpdateBannerDTO } from '@/core/entities/banner.entity';

/**
 * Tenant-Aware Banner Repository
 */
export class PrismaBannerRepository implements IBannerRepository {

    async findAll(tenantId: string): Promise<Banner[]> {
        const banners = await prisma.banner.findMany({
            where: { tenantId },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return banners as Banner[];
    }

    async findById(tenantId: string, id: string): Promise<Banner | null> {
        const banner = await prisma.banner.findFirst({
            where: { id, tenantId }
        });
        return banner as Banner | null;
    }

    async findActive(tenantId: string): Promise<Banner[]> {
        const now = new Date();
        const banners = await prisma.banner.findMany({
            where: {
                tenantId,
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

    async create(tenantId: string, data: CreateBannerDTO): Promise<Banner> {
        const banner = await prisma.banner.create({
            data: {
                ...data,
                tenantId, // Assign tenant
                priority: data.priority ?? 0,
                active: data.active ?? true,
                startsAt: new Date(data.startsAt),
                endsAt: new Date(data.endsAt)
            }
        });
        return banner as Banner;
    }

    async update(tenantId: string, id: string, data: UpdateBannerDTO): Promise<Banner> {
        const updateData: any = { ...data };

        if (data.startsAt) {
            updateData.startsAt = new Date(data.startsAt);
        }
        if (data.endsAt) {
            updateData.endsAt = new Date(data.endsAt);
        }

        const banner = await prisma.banner.update({
            where: {
                id,
                tenantId // Ensure ownership
            },
            data: updateData
        });
        return banner as Banner;
    }

    async delete(tenantId: string, id: string): Promise<void> {
        await prisma.banner.delete({
            where: {
                id,
                tenantId
            }
        });
    }

    async incrementImpressions(tenantId: string, id: string): Promise<void> {
        await prisma.banner.update({
            where: {
                id,
                tenantId
            },
            data: {
                impressions: {
                    increment: 1
                }
            }
        });
    }

    async incrementClicks(tenantId: string, id: string): Promise<void> {
        await prisma.banner.update({
            where: {
                id,
                tenantId
            },
            data: {
                clicks: {
                    increment: 1
                }
            }
        });
    }

    async getStats(tenantId: string): Promise<{ totalBanners: number; activeBanners: number }> {
        const now = new Date();
        const [totalBanners, activeBanners] = await Promise.all([
            prisma.banner.count({ where: { tenantId } }),
            prisma.banner.count({
                where: {
                    tenantId,
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
