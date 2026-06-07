import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

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
