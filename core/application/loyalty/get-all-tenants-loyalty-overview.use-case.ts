import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { buildLoyaltyTenantOverview } from "@/core/application/loyalty/get-tenant-loyalty-overview.use-case";

export class GetAllTenantsLoyaltyOverviewUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
    ) {}

    async execute(): Promise<UseCaseResult<any[]>> {
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
