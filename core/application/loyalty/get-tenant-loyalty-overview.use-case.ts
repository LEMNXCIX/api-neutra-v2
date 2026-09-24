import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { Tenant } from "@/core/entities/tenant.entity";
import { parseLoyaltyConfig } from "@/core/application/loyalty/parse-loyalty-config";

export async function buildLoyaltyTenantOverview(
    tenant: Tenant,
    loyaltyRepository: ILoyaltyRepository,
) {
    const config = parseLoyaltyConfig(tenant.config);
    const [stats, recentLedger, recentClaims] = await Promise.all([
        loyaltyRepository.getTenantStats(tenant.id),
        loyaltyRepository.findRecentLedgerEntries(tenant.id),
        loyaltyRepository.findRecentRewardClaims(tenant.id),
    ]);

    return {
        tenantId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        active: tenant.active,
        config,
        stats,
        recentLedger,
        recentClaims,
    };
}

export class GetTenantLoyaltyOverviewUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
    ) {}

    async execute(tenantId: string): Promise<UseCaseResult> {
        if (!tenantId) {
            throw new ValidationError(
                "Tenant ID is required",
                "MISSING_REQUIRED_FIELDS",
            );
        }

        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) {
            throw new EntityNotFoundError("Tenant", tenantId);
        }

        return Success(
            await buildLoyaltyTenantOverview(tenant, this.loyaltyRepository),
            "Loyalty overview retrieved successfully",
        );
    }
}
