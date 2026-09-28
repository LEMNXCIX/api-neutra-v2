import {
    buildLoyaltyTenantOverview,
    type LoyaltyCampaignTenantOverview,
} from "@/core/application/loyalty/get-tenant-loyalty-overview.use-case";
import type { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetAllTenantsLoyaltyOverviewUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
    ) {}

    async execute(): Promise<UseCaseResult<LoyaltyCampaignTenantOverview[]>> {
        const tenants = await this.tenantRepository.findAll();
        // ponytail: one aggregate query per tenant; batch with groupBy if the tenant count grows.
        const overviews = await Promise.all(
            tenants.map((tenant) =>
                buildLoyaltyTenantOverview(tenant, this.loyaltyRepository),
            ),
        );
        return Success(
            overviews,
            "Cross-tenant loyalty overview retrieved successfully",
        );
    }
}
