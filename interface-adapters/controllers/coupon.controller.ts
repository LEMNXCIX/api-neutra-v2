import type { Request, Response } from "express";
import type { CreateCouponUseCase } from "@/core/application/coupons/create-coupon.use-case";
import type { DeleteCouponUseCase } from "@/core/application/coupons/delete-coupon.use-case";
import type { GetCouponStatsUseCase } from "@/core/application/coupons/get-coupon-stats.use-case";
import type { GetCouponsUseCase } from "@/core/application/coupons/get-coupons.use-case";
import type { GetCouponsPaginatedUseCase } from "@/core/application/coupons/get-coupons-paginated.use-case";
import type { UpdateCouponUseCase } from "@/core/application/coupons/update-coupon.use-case";
import type { ValidateCouponUseCase } from "@/core/application/coupons/validate-coupon.use-case";
import type {
    CreateCouponDTO,
    UpdateCouponDTO,
    ValidateCouponDTO,
} from "@/core/application/dtos/requests/coupon.request";
import type { CouponListQueryDto } from "@/core/application/dtos/requests/list-query.dto";
import { CouponResponse } from "@/core/application/dtos/responses/coupon/coupon.response";
import { parsePagination } from "@/core/utils/pagination";
import { present } from "@/core/utils/use-case-result";
import { tenantIdOf } from "@/helpers/request-context.helpers";

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
        const tenantId = tenantIdOf(req);
        const result = await this.createCouponUseCase.execute(
            tenantId,
            req.validatedBody as CreateCouponDTO,
        );
        return res.status(201).json(present(result, CouponResponse.fromEntity));
    };

    getAll = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);

        const query = (req.validatedQuery ?? {}) as CouponListQueryDto;
        const { page, limit } = parsePagination(query);

        if (
            query.page ||
            query.limit ||
            query.search ||
            query.type ||
            query.status
        ) {
            // Use paginated endpoint
            const result = await this.getCouponsPaginatedUseCase.execute(
                tenantId,
                {
                    search: query.search,
                    type: query.type,
                    status: query.status as
                        | "active"
                        | "expired"
                        | "used"
                        | "unused"
                        | "all"
                        | undefined,
                    page: query.page ? page : undefined,
                    limit: query.limit ? limit : undefined,
                },
            );
            return res.json(
                present(result, (coupons) =>
                    Array.isArray(coupons)
                        ? coupons.map((c) => CouponResponse.fromEntity(c))
                        : [],
                ),
            );
        } else {
            // Use original endpoint for backward compatibility
            const result = await this.getCouponsUseCase.execute(
                tenantId,
                false,
            );
            return res.json(
                present(result, (coupons) =>
                    Array.isArray(coupons)
                        ? coupons.map((c) => CouponResponse.fromEntity(c))
                        : [],
                ),
            );
        }
    };

    getById = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;
        const result = await this.getCouponsUseCase.executeById(tenantId, id);
        return res.json(present(result, CouponResponse.fromEntity));
    };

    getByCode = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);
        const { code } = req.params;
        const result = await this.getCouponsUseCase.executeByCode(
            tenantId,
            code,
        );
        return res.json(present(result, CouponResponse.fromEntity));
    };

    update = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;
        const result = await this.updateCouponUseCase.execute(
            tenantId,
            id,
            req.validatedBody as UpdateCouponDTO,
        );
        return res.json(present(result, CouponResponse.fromEntity));
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;
        const result = await this.deleteCouponUseCase.execute(tenantId, id);
        return res.json(result);
    };

    validate = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);
        const result = await this.validateCouponUseCase.execute(
            tenantId,
            req.validatedBody as ValidateCouponDTO,
        );

        return res.json(
            present(result, (data) => ({
                valid: data.valid,
                coupon: data.coupon
                    ? CouponResponse.fromEntity(data.coupon)
                    : null,
                discountAmount: data.discountAmount,
            })),
        );
    };

    getStats = async (req: Request, res: Response) => {
        const tenantId = tenantIdOf(req);

        const result = await this.getCouponStatsUseCase.execute(tenantId);
        return res.json(result);
    };
}
