import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

/**
 * "My tenants" means the tenants the user CREATED, not the ones they hold a
 * membership in: both readings are plausible from the route name, and only the
 * first one answers "instances I made". Membership stays an access rule, not a
 * list.
 */
export class GetMyTenantsUseCase {
    constructor(private tenantRepository: ITenantRepository) {}

    async execute(userId: string): Promise<UseCaseResult> {
        const tenants = await this.tenantRepository.findCreatedByUserId(userId);
        return Success(tenants);
    }
}
