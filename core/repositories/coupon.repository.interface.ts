import { Coupon, CreateCouponDTO, UpdateCouponDTO } from '../entities/coupon.entity';

export interface ICouponRepository {
    findAll(): Promise<Coupon[]>;
    findById(id: string): Promise<Coupon | null>;
    findByCode(code: string): Promise<Coupon | null>;
    findActive(): Promise<Coupon[]>;
    create(data: CreateCouponDTO): Promise<Coupon>;
    update(id: string, data: UpdateCouponDTO): Promise<Coupon>;
    delete(id: string): Promise<void>;
    incrementUsage(id: string): Promise<void>;
}
