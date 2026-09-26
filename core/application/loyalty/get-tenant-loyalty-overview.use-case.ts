import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import { Tenant } from "@/core/entities/tenant.entity";
import {
    LoyaltyCampaign,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { loadLoyaltyCampaignTenant } from "@/core/application/loyalty/create-loyalty-campaign.use-case";
import { ValidationErrorCodes } from "@/types/error-codes";

export interface LoyaltyCampaignTenantStats {
    campaignCount: number;
    activeCampaignCount: number;
    endedCampaignCount: number;
    archivedCampaignCount: number;
    totalClaims: number;
}

export interface LoyaltyCampaignTenantOverview {
    tenantId: string;
    name: string;
    slug: string;
    type: string;
    active: boolean;
    campaigns: LoyaltyCampaign[];
    stats: LoyaltyCampaignTenantStats;
}

export async function buildLoyaltyCampaignTenantOverview(
    tenant: Tenant,
    loyaltyRepository: ILoyaltyRepository,
): Promise<LoyaltyCampaignTenantOverview> {
    const campaigns = await loyaltyRepository.listCampaigns(tenant.id);
    // One claim count for the tenant, not one statistics read per campaign. That
    // read re-read a campaign to reach a claimedCount this list already held, so
    // the loop bought a query per campaign and nothing else. Counting claim rows
    // is also the honest total when a campaign's claimedCount has drifted from
    // its claims.
    const totalClaims =
        await loyaltyRepository.countCampaignRewardClaims(tenant.id);
    return {
        tenantId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        type: tenant.type,
        active: tenant.active,
        campaigns,
        stats: {
            campaignCount: campaigns.length,
            activeCampaignCount: campaigns.filter(
                (campaign) => campaign.status === LoyaltyCampaignStatus.ACTIVE,
            ).length,
            endedCampaignCount: campaigns.filter(
                (campaign) => campaign.status === LoyaltyCampaignStatus.ENDED,
            ).length,
            archivedCampaignCount: campaigns.filter(
                (campaign) => campaign.status === LoyaltyCampaignStatus.ARCHIVED,
            ).length,
            totalClaims,
        },
    };
}

export async function buildLoyaltyTenantOverview(
    tenant: Tenant,
    loyaltyRepository: ILoyaltyRepository,
): Promise<LoyaltyCampaignTenantOverview> {
    return buildLoyaltyCampaignTenantOverview(tenant, loyaltyRepository);
}

export class GetTenantLoyaltyOverviewUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(tenantId: string): Promise<UseCaseResult<LoyaltyCampaignTenantOverview>> {
        if (!tenantId?.trim()) {
            throw new ValidationError(
                "Tenant ID is required",
                ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
            );
        }
        const tenant = await loadLoyaltyCampaignTenant(
            this.tenantRepository,
            this.featureRepository,
            tenantId,
        );
        if (!tenant) throw new EntityNotFoundError("Tenant", tenantId);
        return Success(
            await buildLoyaltyTenantOverview(tenant, this.loyaltyRepository),
            "Loyalty overview retrieved successfully",
        );
    }
}
