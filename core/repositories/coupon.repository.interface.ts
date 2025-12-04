import { Coupon, CreateCouponDTO, UpdateCouponDTO } from '@/core/entities/coupon.entity';

export interface ICouponRepository {
    findAll(): Promise<Coupon[]>;
    findById(id: string): Promise<Coupon | null>;
    findByCode(code: string): Promise<Coupon | null>;
    findActive(): Promise<Coupon[]>;
    findAllPaginated(options: {
        search?: string;
        type?: string;
        status?: 'active' | 'expired' | 'used' | 'unused' | 'all';
        page: number;
        limit: number;
    }): Promise<{
        coupons: Coupon[];
        total: number;
    }>;
    create(data: CreateCouponDTO): Promise<Coupon>;
    update(id: string, data: UpdateCouponDTO): Promise<Coupon>;
    delete(id: string): Promise<void>;
    incrementUsage(id: string): Promise<void>;
    getStats(): Promise<{
        totalCoupons: number;
        activeCoupons: number;
        usedCoupons: number;
        unusedCoupons: number;
        expiredCoupons: number;
    }>;
}
