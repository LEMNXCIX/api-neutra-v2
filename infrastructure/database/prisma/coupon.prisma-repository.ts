import { prisma } from '@/config/db.config';
import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { Coupon, CreateCouponDTO, UpdateCouponDTO } from '@/core/entities/coupon.entity';

export class PrismaCouponRepository implements ICouponRepository {
    async findAll(): Promise<Coupon[]> {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return coupons as Coupon[];
    }

    async findById(id: string): Promise<Coupon | null> {
        const coupon = await prisma.coupon.findUnique({
            where: { id }
        });
        return coupon as Coupon | null;
    }

    async findByCode(code: string): Promise<Coupon | null> {
        const coupon = await prisma.coupon.findUnique({
            where: { code: code.toUpperCase() }
        });
        return coupon as Coupon | null;
    }

    async findActive(): Promise<Coupon[]> {
        const now = new Date();
        const coupons = await prisma.coupon.findMany({
            where: {
                active: true,
                expiresAt: { gte: now }
            },
            orderBy: { createdAt: 'desc' }
        });
        return coupons as Coupon[];
    }

    async create(data: CreateCouponDTO): Promise<Coupon> {
        const coupon = await prisma.coupon.create({
            data: {
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

    async update(id: string, data: UpdateCouponDTO): Promise<Coupon> {
        const updateData: any = { ...data };

        if (data.code) {
            updateData.code = data.code.toUpperCase();
        }
        if (data.expiresAt) {
            updateData.expiresAt = new Date(data.expiresAt);
        }

        const coupon = await prisma.coupon.update({
            where: { id },
            data: updateData
        });
        return coupon as Coupon;
    }

    async delete(id: string): Promise<void> {
        await prisma.coupon.delete({
            where: { id }
        });
    }

    async incrementUsage(id: string): Promise<void> {
        await prisma.coupon.update({
            where: { id },
            data: {
                usageCount: {
                    increment: 1
                }
            }
        });
    }
}
