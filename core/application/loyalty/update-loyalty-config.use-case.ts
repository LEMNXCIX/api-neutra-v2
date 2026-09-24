import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ICouponRepository } from "@/core/repositories/coupon.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import {
    isPersonalCoupon,
    isRewardCoupon,
} from "@/core/entities/coupon.entity";
import { isValidLoyaltyTargetPoints } from "@/core/entities/loyalty.entity";
import { UpdateLoyaltyConfigDTO } from "@/core/application/dtos/requests/loyalty.request";
import { parseLoyaltyConfig } from "@/core/application/loyalty/parse-loyalty-config";

const ALLOWED_CONFIG_FIELDS = new Set([
    "targetPoints",
    "rewardCouponId",
]);

export class UpdateLoyaltyConfigUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private couponRepository: ICouponRepository,
    ) {}

    async execute(
        tenantId: string,
        data: UpdateLoyaltyConfigDTO,
    ): Promise<UseCaseResult> {
        if (!tenantId) {
            throw new ValidationError(
                "Tenant ID is required",
                "MISSING_REQUIRED_FIELDS",
            );
        }
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new ValidationError(
                "Loyalty configuration must be an object",
                "INVALID_LOYALTY_CONFIG",
            );
        }

        const unsupportedField = Object.keys(data).find(
            (field) => !ALLOWED_CONFIG_FIELDS.has(field),
        );
        if (unsupportedField) {
            throw new ValidationError(
                `Unsupported loyalty configuration field: ${unsupportedField}`,
                "INVALID_LOYALTY_CONFIG",
            );
        }

        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) {
            throw new EntityNotFoundError("Tenant", tenantId);
        }

        const current = parseLoyaltyConfig(tenant.config);
        const targetPoints =
            data.targetPoints === undefined
                ? current.targetPoints
                : data.targetPoints;
        if (!isValidLoyaltyTargetPoints(targetPoints)) {
            throw new ValidationError(
                "Loyalty targetPoints must be a positive safe integer",
                "INVALID_LOYALTY_TARGET_POINTS",
            );
        }

        const hasRewardCouponField = data.rewardCouponId !== undefined;
        const rewardCouponId = hasRewardCouponField
            ? data.rewardCouponId
            : current.rewardCouponId;
        const normalizedRewardCouponId =
            typeof rewardCouponId === "string"
                ? rewardCouponId.trim()
                : rewardCouponId;
        if (
            (hasRewardCouponField || normalizedRewardCouponId !== undefined) &&
            normalizedRewardCouponId !== null &&
            typeof normalizedRewardCouponId !== "string"
        ) {
            throw new ValidationError(
                "Loyalty rewardCouponId must be a non-empty string or null",
                "INVALID_LOYALTY_REWARD_COUPON",
            );
        }
        if (normalizedRewardCouponId === "") {
            throw new ValidationError(
                "Loyalty rewardCouponId must be a non-empty string or null",
                "INVALID_LOYALTY_REWARD_COUPON",
            );
        }

        if (typeof normalizedRewardCouponId === "string") {
            const template = await this.couponRepository.findById(
                tenantId,
                normalizedRewardCouponId,
            );
            const expiresAt = template
                ? new Date(template.expiresAt).getTime()
                : Number.NaN;
            if (
                !template ||
                isPersonalCoupon(template) ||
                isRewardCoupon(template) ||
                !template.active ||
                !Number.isFinite(expiresAt) ||
                expiresAt <= Date.now()
            ) {
                throw new ValidationError(
                    "Loyalty rewardCouponId must reference a shared coupon template in this tenant",
                    "INVALID_LOYALTY_REWARD_COUPON",
                );
            }
        }

        await this.tenantRepository.update(tenantId, {
            config: {
                ...(tenant.config ?? {}),
                loyalty: {
                    targetPoints,
                    rewardCouponId: normalizedRewardCouponId ?? null,
                },
            },
        });

        return Success(
            {
                targetPoints,
                rewardCouponId: normalizedRewardCouponId ?? null,
            },
            "Loyalty configuration updated successfully",
        );
    }
}
