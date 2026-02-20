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
    constructor(private couponRepository: ICouponRepository) { }

    create = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const useCase = new CreateCouponUseCase(this.couponRepository);
        const result = await useCase.execute(tenantId, req.body);
        return res.status(result.code).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;

        // Check if pagination/filtering query params are present
        const { search, type, status, page, limit } = req.query;

        if (page || limit || search || type || status) {
            // Use paginated endpoint
            const useCase = new GetCouponsPaginatedUseCase(this.couponRepository);
            const result = await useCase.execute(tenantId, {
                search: search as string,
                type: type as string,
                status: status as any,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined
            });
            return res.status(result.code).json(result);
        } else {
            // Use original endpoint for backward compatibility
            const useCase = new GetCouponsUseCase(this.couponRepository);
            const result = await useCase.execute(tenantId, false);
            return res.status(result.code).json(result);
        }
    }

    getById = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new GetCouponsUseCase(this.couponRepository);
        const result = await useCase.executeById(tenantId, id);
        return res.status(result.code).json(result);
    }

    getByCode = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { code } = req.params;
        const useCase = new GetCouponsUseCase(this.couponRepository);
        const result = await useCase.executeByCode(tenantId, code);
        return res.status(result.code).json(result);
    }

    update = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new UpdateCouponUseCase(this.couponRepository);
        const result = await useCase.execute(tenantId, id, req.body);
        return res.status(result.code).json(result);
    }

    delete = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new DeleteCouponUseCase(this.couponRepository);
        const result = await useCase.execute(tenantId, id);
        return res.status(result.code).json(result);
    }

    validate = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const useCase = new ValidateCouponUseCase(this.couponRepository);
        const result = await useCase.execute(tenantId, req.body);

        return res.status(result.valid ? 200 : 400).json({
            success: result.valid,
            code: result.valid ? 200 : 400,
            message: result.message,
            data: result.valid ? {
                coupon: result.coupon,
                discountAmount: result.discountAmount
            } : null
        });
    }

    getStats = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;

        const useCase = new GetCouponStatsUseCase(this.couponRepository);
        const result = await useCase.execute(tenantId);
        return res.status(result.code).json(result);
    }
}
