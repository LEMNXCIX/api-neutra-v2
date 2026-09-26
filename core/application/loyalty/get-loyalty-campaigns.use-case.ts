import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import {
    LoyaltyCampaign,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";
import {
    assertLoyaltyCampaignSourceCompatible,
} from "@/core/domain/loyalty/loyalty.policy";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { loadLoyaltyCampaignTenant } from "@/core/application/loyalty/create-loyalty-campaign.use-case";
import { GetCustomerLoyaltySummaryUseCase } from "@/core/application/loyalty/get-customer-loyalty-summary.use-case";

export interface GetLoyaltyCampaignsOptions {
    source?: LoyaltyCampaignSource;
    status?: LoyaltyCampaignStatus;
}

export class GetLoyaltyCampaignsUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(
        tenantId: string,
        options: GetLoyaltyCampaignsOptions = {},
    ): Promise<UseCaseResult<LoyaltyCampaign[]>> {
        const tenant = await loadLoyaltyCampaignTenant(
            this.tenantRepository,
            this.featureRepository,
            tenantId,
        );
        if (options.source) {
            assertLoyaltyCampaignSourceCompatible(tenant.type, options.source);
        }
        const campaigns = await this.loyaltyRepository.listCampaigns(tenantId);
        return Success(
            campaigns.filter(
                (campaign) =>
                    (!options.source || campaign.source === options.source) &&
                    (!options.status || campaign.status === options.status),
            ),
            "Loyalty campaigns retrieved successfully",
        );
    }
}

export class GetCustomerLoyaltyCampaignsUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(tenantId: string, userId: string) {
        return new GetCustomerLoyaltySummaryUseCase(
            this.loyaltyRepository,
            this.tenantRepository,
            this.featureRepository,
        ).executeList(tenantId, userId);
    }
}
