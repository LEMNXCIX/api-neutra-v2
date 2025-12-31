import { IWhatsAppConfigRepository } from '@/core/repositories/whatsapp-config.repository.interface';
import { WhatsAppConfig } from '@/core/entities/whatsapp-config.entity';
import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';

export class ConfigureWhatsAppUseCase {
    constructor(
        private whatsappConfigRepository: IWhatsAppConfigRepository,
        private featureRepository: IFeatureRepository
    ) { }

    async execute(tenantId: string, configData: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
        // Check if tenant has WHATSAPP_NOTIFICATIONS feature enabled
        const features = await this.featureRepository.getTenantFeatureStatus(tenantId);
        if (!features['WHATSAPP_NOTIFICATIONS']) {
            throw new Error('Upgrade required: WHATSAPP_NOTIFICATIONS feature is not enabled for this tenant.');
        }

        const existingConfig = await this.whatsappConfigRepository.findByTenantId(tenantId);

        if (existingConfig) {
            // Update existing
            return this.whatsappConfigRepository.update(tenantId, configData);
        } else {
            // Create new config
            // Ensure required fields are present or defaults are handled
            if (!configData.phoneNumberId || !configData.businessAccountId || !configData.accessToken) {
                throw new Error("Missing required WhatsApp credentials");
            }

            return this.whatsappConfigRepository.create({
                tenantId,
                phoneNumberId: configData.phoneNumberId!,
                businessAccountId: configData.businessAccountId!,
                accessToken: configData.accessToken!,
                webhookVerifyToken: configData.webhookVerifyToken || 'default_token', // Should be validated
                enabled: configData.enabled ?? false,
                notificationsEnabled: configData.notificationsEnabled ?? true,
                botEnabled: configData.botEnabled ?? false,
                templates: configData.templates,
                botConfig: configData.botConfig
            });
        }
    }
}
