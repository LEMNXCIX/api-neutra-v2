import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetTenantsUseCase {
    constructor(private tenantRepository: ITenantRepository) {}

    async execute(): Promise<UseCaseResult> {
        const tenants = await this.tenantRepository.findAll();
        return Success(tenants);
    }
}
