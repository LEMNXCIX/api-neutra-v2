import { Request, Response } from 'express';
import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { CreateCouponUseCase } from '@/core/application/coupons/create-coupon.use-case';
import { GetCouponsUseCase } from '@/core/application/coupons/get-coupons.use-case';
import { GetCouponsPaginatedUseCase } from '@/core/application/coupons/get-coupons-paginated.use-case';
import { UpdateCouponUseCase } from '@/core/application/coupons/update-coupon.use-case';
import { DeleteCouponUseCase } from '@/core/application/coupons/delete-coupon.use-case';
import { ValidateCouponUseCase } from '@/core/application/coupons/validate-coupon.use-case';
import { GetCouponStatsUseCase } from '@/core/application/coupons/get-coupon-stats.use-case';

export class CouponController {
    constructor(
        private createCouponUseCase: CreateCouponUseCase,
        private getCouponsUseCase: GetCouponsUseCase,
        private getCouponsPaginatedUseCase: GetCouponsPaginatedUseCase,
        private updateCouponUseCase: UpdateCouponUseCase,
        private deleteCouponUseCase: DeleteCouponUseCase,
        private validateCouponUseCase: ValidateCouponUseCase,
        private getCouponStatsUseCase: GetCouponStatsUseCase
    ) { }

    create = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.createCouponUseCase.execute(tenantId, req.body);
        return res.status(201).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;

        // Check if pagination/filtering query params are present
        const { search, type, status, page, limit } = req.query;

        if (page || limit || search || type || status) {
            // Use paginated endpoint
            const result = await this.getCouponsPaginatedUseCase.execute(tenantId, {
                search: search as string,
                type: type as string,
                status: status as any,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined
            });
            return res.json(result);
        } else {
            // Use original endpoint for backward compatibility
            const result = await this.getCouponsUseCase.execute(tenantId, false);
            return res.json(result);
        }
    }

    getById = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.getCouponsUseCase.executeById(tenantId, id);
        return res.json(result);
    }

    getByCode = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { code } = req.params;
        const result = await this.getCouponsUseCase.executeByCode(tenantId, code);
        return res.json(result);
    }

    update = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.updateCouponUseCase.execute(tenantId, id, req.body);
        return res.json(result);
    }

    delete = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const result = await this.deleteCouponUseCase.execute(tenantId, id);
        return res.json(result);
    }

    validate = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const result = await this.validateCouponUseCase.execute(tenantId, req.body);

        return res.json({
            success: result.valid,
            code: 200,
            message: result.message,
            data: result.valid ? {
                coupon: result.coupon,
                discountAmount: result.discountAmount
            } : null
        });
    }

    getStats = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;

        const result = await this.getCouponStatsUseCase.execute(tenantId);
        return res.json(result);
    }
}
