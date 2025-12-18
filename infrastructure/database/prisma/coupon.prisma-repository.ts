import { prisma } from '@/config/db.config';
import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { Coupon, CreateCouponDTO, UpdateCouponDTO } from '@/core/entities/coupon.entity';

/**
 * Tenant-Aware Coupon Repository
 */
export class PrismaCouponRepository implements ICouponRepository {
    async findAll(tenantId: string): Promise<Coupon[]> {
        const coupons = await prisma.coupon.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });
        return coupons as Coupon[];
    }

    async findById(tenantId: string, id: string): Promise<Coupon | null> {
        const coupon = await prisma.coupon.findFirst({
            where: { id, tenantId }
        });
        return coupon as Coupon | null;
    }

    async findByCode(tenantId: string, code: string): Promise<Coupon | null> {
        const coupon = await prisma.coupon.findFirst({
            where: {
                tenantId,
                code: code.toUpperCase()
            }
        });
        return coupon as Coupon | null;
    }

    async findActive(tenantId: string): Promise<Coupon[]> {
        const now = new Date();
        const coupons = await prisma.coupon.findMany({
            where: {
                tenantId,
                active: true,
                expiresAt: { gte: now }
            },
            orderBy: { createdAt: 'desc' }
        });
        return coupons as Coupon[];
    }

    async findAllPaginated(tenantId: string, options: {
        search?: string;
        type?: string;
        status?: 'active' | 'expired' | 'used' | 'unused' | 'all';
        page: number;
        limit: number;
    }): Promise<{
        coupons: Coupon[];
        total: number;
    }> {
        const { search, type, status, page, limit } = options;
        const now = new Date();

        // Build where clause
        const where: any = { tenantId };

        // Search filter (case-insensitive search on code)
        if (search) {
            where.code = {
                contains: search.toUpperCase(),
                mode: 'insensitive'
            };
        }

        // Type filter
        if (type && type !== 'all') {
            where.type = type;
        }

        // Status filter
        if (status && status !== 'all') {
            switch (status) {
                case 'active':
                    where.active = true;
                    where.expiresAt = { gte: now };
                    break;
                case 'expired':
                    where.expiresAt = { lt: now };
                    break;
                case 'used':
                    where.usageCount = { gt: 0 };
                    break;
                case 'unused':
                    where.usageCount = 0;
                    break;
            }
        }

        // Execute queries in parallel
        const [coupons, total] = await Promise.all([
            prisma.coupon.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.coupon.count({ where })
        ]);

        return {
            coupons: coupons as Coupon[],
            total
        };
    }

    async create(tenantId: string, data: CreateCouponDTO): Promise<Coupon> {
        const coupon = await prisma.coupon.create({
            data: {
                tenantId, // Assign tenant
                code: data.code.toUpperCase(),
                type: data.type,
                value: data.value,
                description: data.description,
                minPurchaseAmount: data.minPurchaseAmount,
                maxDiscountAmount: data.maxDiscountAmount,
                usageLimit: data.usageLimit,
                active: data.active ?? true,
                expiresAt: new Date(data.expiresAt),
                applicableProducts: data.applicableProducts || [],
                applicableCategories: data.applicableCategories || []
            }
        });
        return coupon as Coupon;
    }

    async update(tenantId: string, id: string, data: UpdateCouponDTO): Promise<Coupon> {
        const updateData: any = { ...data };

        if (data.code) {
            updateData.code = data.code.toUpperCase();
        }
        if (data.expiresAt) {
            updateData.expiresAt = new Date(data.expiresAt);
        }

        const coupon = await prisma.coupon.update({
            where: {
                id,
                tenantId // Ensure ownership
            },
            data: updateData
        });
        return coupon as Coupon;
    }

    async delete(tenantId: string, id: string): Promise<void> {
        await prisma.coupon.delete({
            where: {
                id,
                tenantId
            }
        });
    }

    async incrementUsage(tenantId: string, id: string): Promise<void> {
        await prisma.coupon.update({
            where: {
                id,
                tenantId
            },
            data: {
                usageCount: {
                    increment: 1
                }
            }
        });
    }

    async getStats(tenantId: string): Promise<{
        totalCoupons: number;
        activeCoupons: number;
        usedCoupons: number;
        unusedCoupons: number;
        expiredCoupons: number;
    }> {
        const now = new Date();
        const [totalCoupons, activeCoupons, usedCoupons, unusedCoupons, expiredCoupons] = await Promise.all([
            prisma.coupon.count({ where: { tenantId } }),
            prisma.coupon.count({ where: { tenantId, active: true, expiresAt: { gte: now } } }),
            prisma.coupon.count({ where: { tenantId, usageCount: { gt: 0 } } }),
            prisma.coupon.count({ where: { tenantId, usageCount: 0 } }),
            prisma.coupon.count({ where: { tenantId, expiresAt: { lt: now } } })
        ]);

        return {
            totalCoupons,
            activeCoupons,
            usedCoupons,
            unusedCoupons,
            expiredCoupons
        };
    }
}
