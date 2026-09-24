import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { ParsedLoyaltyConfig } from "@/core/entities/loyalty.entity";
import { parseLoyaltyConfig } from "@/core/application/loyalty/parse-loyalty-config";

export class GetLoyaltyConfigUseCase {
    constructor(private tenantRepository: ITenantRepository) {}

    async execute(
        tenantId: string,
    ): Promise<UseCaseResult<ParsedLoyaltyConfig>> {
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
            parseLoyaltyConfig(tenant.config),
            "Loyalty configuration retrieved successfully",
        );
    }
}
