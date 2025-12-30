import { WhatsAppBotService } from '@/infrastructure/services/whatsapp-bot.service';
import { IWhatsAppConfigRepository } from '@/core/repositories/whatsapp-config.repository.interface';

export class ProcessIncomingMessageUseCase {
    constructor(
        private whatsappBotService: WhatsAppBotService,
        private whatsappConfigRepository: IWhatsAppConfigRepository
    ) { }

    async execute(messagePayload: any): Promise<void> {
        const metadata = messagePayload.metadata;
        const phoneNumberId = metadata?.phone_number_id;

        if (!phoneNumberId) {
            console.error("Missing phone_number_id in webhook metadata");
            return;
        }

        // Resolve Tenant
        const config = await this.whatsappConfigRepository.findByPhoneNumberId(phoneNumberId);

        if (!config) {
            console.error(`No WhatsApp config found for phone number ID: ${phoneNumberId}`);
            return;
        }

        const tenantId = config.tenantId;

        // Dispatch to bot service
        await this.whatsappBotService.processIncomingMessage(messagePayload, tenantId);
    }
}
