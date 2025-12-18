import { Coupon, CreateCouponDTO, UpdateCouponDTO } from '@/core/entities/coupon.entity';

/**
 * Coupon Repository Interface - Tenant-Scoped
 */
export interface ICouponRepository {
    findAll(tenantId: string): Promise<Coupon[]>;
    findById(tenantId: string, id: string): Promise<Coupon | null>;
    findByCode(tenantId: string, code: string): Promise<Coupon | null>;
    findActive(tenantId: string): Promise<Coupon[]>;
    findAllPaginated(tenantId: string, options: {
        search?: string;
        type?: string;
        status?: 'active' | 'expired' | 'used' | 'unused' | 'all';
        page: number;
        limit: number;
    }): Promise<{
        coupons: Coupon[];
        total: number;
    }>;
    create(tenantId: string, data: CreateCouponDTO): Promise<Coupon>;
    update(tenantId: string, id: string, data: UpdateCouponDTO): Promise<Coupon>;
    delete(tenantId: string, id: string): Promise<void>;
    incrementUsage(tenantId: string, id: string): Promise<void>;
    getStats(tenantId: string): Promise<{
        totalCoupons: number;
        activeCoupons: number;
        usedCoupons: number;
        unusedCoupons: number;
        expiredCoupons: number;
    }>;
}
