import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import {
    ILoyaltyRepository,
    LoyaltyRewardClaimResult,
} from "@/core/repositories/loyalty.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { parseLoyaltyConfig } from "@/core/application/loyalty/parse-loyalty-config";

export class ClaimLoyaltyRewardUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
    ) {}

    async execute(
        tenantId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyRewardClaimResult>> {
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
        if (!config.rewardCouponId) {
            throw new BusinessRuleViolationError(
                "The loyalty reward is not configured",
                "LOYALTY_REWARD_NOT_CONFIGURED",
            );
        }

        const result = await this.loyaltyRepository.claimReward(
            tenantId,
            userId,
            config.rewardCouponId,
            config.targetPoints,
        );
        return Success(result, "Loyalty reward claimed successfully");
    }
}
