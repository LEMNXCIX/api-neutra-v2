import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetTenantByIdUseCase {
    constructor(private tenantRepository: ITenantRepository) {}

    async execute(id: string): Promise<UseCaseResult> {
        const tenant = await this.tenantRepository.findById(id);
        if (!tenant) {
            throw new EntityNotFoundError("Tenant", id);
        }

        return Success(tenant);
    }
}
