import { Request, Response } from "express";
import { CreateCouponUseCase } from "@/core/application/coupons/create-coupon.use-case";
import { GetCouponsUseCase } from "@/core/application/coupons/get-coupons.use-case";
import { GetCouponsPaginatedUseCase } from "@/core/application/coupons/get-coupons-paginated.use-case";
import { UpdateCouponUseCase } from "@/core/application/coupons/update-coupon.use-case";
import { DeleteCouponUseCase } from "@/core/application/coupons/delete-coupon.use-case";
import { ValidateCouponUseCase } from "@/core/application/coupons/validate-coupon.use-case";
import { GetCouponStatsUseCase } from "@/core/application/coupons/get-coupon-stats.use-case";
import { CouponPresenter } from "@/core/presenters/coupon.presenter";
import { present } from "@/core/utils/use-case-result";

export class CouponController {
    constructor(
        private createCouponUseCase: CreateCouponUseCase,
        private getCouponsUseCase: GetCouponsUseCase,
        private getCouponsPaginatedUseCase: GetCouponsPaginatedUseCase,
        private updateCouponUseCase: UpdateCouponUseCase,
        private deleteCouponUseCase: DeleteCouponUseCase,
        private validateCouponUseCase: ValidateCouponUseCase,
        private getCouponStatsUseCase: GetCouponStatsUseCase,
    ) {}

    create = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.createCouponUseCase.execute(
            tenantId,
            req.body,
        );
        return res
            .status(201)
            .json(present(result, CouponPresenter.toResponse));
    };

    getAll = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;

        // Check if pagination/filtering query params are present
        const { search, type, status, page, limit } = req.query;

        if (page || limit || search || type || status) {
            // Use paginated endpoint
            const result = await this.getCouponsPaginatedUseCase.execute(
                tenantId,
                {
                    search: search as string,
                    type: type as string,
                    status: status as
                        | "active"
                        | "expired"
                        | "used"
                        | "unused"
                        | "all"
                        | undefined,
                    page: page ? parseInt(page as string) : undefined,
                    limit: limit ? parseInt(limit as string) : undefined,
                },
            );
            return res.json(present(result, CouponPresenter.toResponseList));
        } else {
            // Use original endpoint for backward compatibility
            const result = await this.getCouponsUseCase.execute(
                tenantId,
                false,
            );
            return res.json(present(result, CouponPresenter.toResponseList));
        }
    };

    getById = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.getCouponsUseCase.executeById(tenantId, id);
        return res.json(present(result, CouponPresenter.toResponse));
    };

    getByCode = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { code } = req.params;
        const result = await this.getCouponsUseCase.executeByCode(
            tenantId,
            code,
        );
        return res.json(present(result, CouponPresenter.toResponse));
    };

    update = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateCouponUseCase.execute(
            tenantId,
            id,
            req.body,
        );
        return res.json(present(result, CouponPresenter.toResponse));
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deleteCouponUseCase.execute(tenantId, id);
        return res.json(result);
    };

    validate = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.validateCouponUseCase.execute(
            tenantId,
            req.body,
        );

        return res.json(
            present(result, (data) => ({
                valid: data.valid,
                coupon: data.coupon
                    ? CouponPresenter.toResponse(data.coupon)
                    : null,
                discountAmount: data.discountAmount,
            })),
        );
    };

    getStats = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;

        const result = await this.getCouponStatsUseCase.execute(tenantId);
        return res.json(result);
    };
}
