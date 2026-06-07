import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class DeleteTenantUseCase {
    constructor(private tenantRepository: ITenantRepository) {}

    async execute(id: string): Promise<UseCaseResult> {
        const tenant = await this.tenantRepository.findById(id);
        if (!tenant) {
            throw new EntityNotFoundError("Tenant", id);
        }

        await this.tenantRepository.delete(id);

        return Success(null, "Tenant deleted successfully");
    }
}
