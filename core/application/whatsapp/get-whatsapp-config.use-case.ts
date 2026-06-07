import { IWhatsAppConfigRepository } from "@/core/repositories/whatsapp-config.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { ValidationError } from "@/core/domain/errors/domain-errors";

export class GetWhatsAppConfigUseCase {
    constructor(private whatsappConfigRepo: IWhatsAppConfigRepository) {}

    async execute(tenantId: string): Promise<UseCaseResult> {
        if (!tenantId) {
            throw new ValidationError(
                "Tenant ID is required",
                "MISSING_REQUIRED_FIELDS",
            );
        }
        const config = await this.whatsappConfigRepo.findByTenantId(tenantId);

        if (!config) {
            return Success(null, "No WhatsApp configuration found");
        }

        return Success(config, "WhatsApp config retrieved successfully");
    }
}
