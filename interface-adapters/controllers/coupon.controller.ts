import { Request, Response } from 'express';
import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { CreateCouponUseCase } from '@/use-cases/coupons/create-coupon.use-case';
import { GetCouponsUseCase } from '@/use-cases/coupons/get-coupons.use-case';
import { UpdateCouponUseCase } from '@/use-cases/coupons/update-coupon.use-case';
import { DeleteCouponUseCase } from '@/use-cases/coupons/delete-coupon.use-case';
import { ValidateCouponUseCase } from '@/use-cases/coupons/validate-coupon.use-case';

export class CouponController {
    constructor(private couponRepository: ICouponRepository) { }

    create = async (req: Request, res: Response) => {
        const useCase = new CreateCouponUseCase(this.couponRepository);
        const result = await useCase.execute(req.body);
        return res.status(result.code).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const useCase = new GetCouponsUseCase(this.couponRepository);
        const result = await useCase.execute(false);
        return res.status(result.code).json(result);
    }

    getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new GetCouponsUseCase(this.couponRepository);
        const result = await useCase.executeById(id);
        return res.status(result.code).json(result);
    }

    getByCode = async (req: Request, res: Response) => {
        const { code } = req.params;
        const useCase = new GetCouponsUseCase(this.couponRepository);
        const result = await useCase.executeByCode(code);
        return res.status(result.code).json(result);
    }

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new UpdateCouponUseCase(this.couponRepository);
        const result = await useCase.execute(id, req.body);
        return res.status(result.code).json(result);
    }

    delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new DeleteCouponUseCase(this.couponRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }

    validate = async (req: Request, res: Response) => {
        const useCase = new ValidateCouponUseCase(this.couponRepository);
        const result = await useCase.execute(req.body);

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
}
