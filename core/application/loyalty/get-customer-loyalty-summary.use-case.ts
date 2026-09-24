import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import {
    LoyaltyStatus,
    LoyaltySummary,
} from "@/core/entities/loyalty.entity";
import { parseLoyaltyConfig } from "@/core/application/loyalty/parse-loyalty-config";

export class GetCustomerLoyaltySummaryUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
    ) {}

    async execute(
        tenantId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltySummary>> {
        if (!tenantId || !userId) {
            throw new ValidationError(
                "Tenant and customer identity are required",
                "MISSING_REQUIRED_FIELDS",
            );
        }

        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) {
            throw new EntityNotFoundError("Tenant", tenantId);
        }

        const config = parseLoyaltyConfig(tenant.config);
        const [points, claim] = await Promise.all([
            this.loyaltyRepository.getPointsBalance(tenantId, userId),
            this.loyaltyRepository.findRewardClaim(tenantId, userId),
        ]);

        const targetPoints = claim?.milestone ?? config.targetPoints;
        const remaining = claim ? 0 : Math.max(targetPoints - points, 0);
        let status: LoyaltyStatus;
        if (claim) {
            status = LoyaltyStatus.CLAIMED;
        } else if (!config.rewardCouponId) {
            status = LoyaltyStatus.NOT_CONFIGURED;
        } else if (points >= targetPoints) {
            status = LoyaltyStatus.READY;
        } else {
            status = LoyaltyStatus.IN_PROGRESS;
        }

        return Success(
            {
                points,
                targetPoints,
                remaining,
                status,
                ...(claim?.coupon ? { coupon: claim.coupon } : {}),
            },
            "Loyalty summary retrieved successfully",
        );
    }
}
