import { IWhatsAppConfigRepository } from "@/core/repositories/whatsapp-config.repository.interface";
import { WhatsAppConfig } from "@/core/entities/whatsapp-config.entity";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { UseCaseResult, Success } from "@/core/utils/use-case-result";
import { ConfigureWhatsAppDTO } from "@/core/application/dtos/requests/whatsapp.request";
import {
    ValidationError,
    ForbiddenError,
} from "@/core/domain/errors/domain-errors";

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
                "MISSING_REQUIRED_FIELDS",
            );
        }
        const features =
            await this.featureRepository.getTenantFeatureStatus(tenantId);
        if (!features["WHATSAPP_NOTIFICATIONS"]) {
            throw new ForbiddenError(
                "Upgrade required: WHATSAPP_NOTIFICATIONS feature is not enabled for this tenant.",
                "FORBIDDEN",
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
                    "MISSING_REQUIRED_FIELDS",
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
