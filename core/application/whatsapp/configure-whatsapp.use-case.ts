import type { ConfigureWhatsAppDTO } from "@/core/application/dtos/requests/whatsapp.request";
import {
    ForbiddenError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import type { WhatsAppConfig } from "@/core/entities/whatsapp-config.entity";
import type { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import type { IWhatsAppConfigRepository } from "@/core/repositories/whatsapp-config.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";
import { AuthErrorCodes, ValidationErrorCodes } from "@/types/error-codes";

export class ConfigureWhatsAppUseCase {
    constructor(
        private whatsappConfigRepository: IWhatsAppConfigRepository,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(
        tenantId: string,
        configData: ConfigureWhatsAppDTO,
    ): Promise<UseCaseResult<WhatsAppConfig>> {
        if (!tenantId) {
            throw new ValidationError(
                "Tenant ID is required",
                ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
            );
        }
        const features =
            await this.featureRepository.getTenantFeatureStatus(tenantId);
        if (!features.WHATSAPP_API) {
            throw new ForbiddenError(
                "Upgrade required: WHATSAPP_API feature is not enabled for this tenant.",
                AuthErrorCodes.FORBIDDEN,
            );
        }

        const existingConfig =
            await this.whatsappConfigRepository.findByTenantId(tenantId);

        if (existingConfig) {
            const updated = await this.whatsappConfigRepository.update(
                tenantId,
                configData,
            );
            return Success(updated, "WhatsApp config updated successfully");
        } else {
            if (
                !configData.phoneNumberId ||
                !configData.businessAccountId ||
                !configData.accessToken
            ) {
                throw new ValidationError(
                    "Missing required WhatsApp credentials",
                    ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
                );
            }

            const created = await this.whatsappConfigRepository.create({
                tenantId,
                phoneNumberId: configData.phoneNumberId!,
                businessAccountId: configData.businessAccountId!,
                accessToken: configData.accessToken!,
                webhookVerifyToken:
                    configData.webhookVerifyToken || "default_token",
                enabled: configData.enabled ?? false,
                notificationsEnabled: configData.notificationsEnabled ?? true,
                botEnabled: configData.botEnabled ?? false,
                templates: configData.templates,
                botConfig: configData.botConfig,
            });
            return Success(created, "WhatsApp config created successfully");
        }
    }
}
