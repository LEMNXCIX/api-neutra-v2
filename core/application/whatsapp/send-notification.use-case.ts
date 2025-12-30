import { WhatsAppService } from '@/infrastructure/services/whatsapp.service';

interface SendNotificationDto {
    tenantId: string;
    to: string;
    templateName: string;
    languageCode?: string;
    components?: any[];
}

export class SendNotificationUseCase {
    constructor(private whatsappService: WhatsAppService) { }

    async execute(data: SendNotificationDto): Promise<string> {
        const { tenantId, to, templateName, languageCode = 'es', components = [] } = data;

        // Delegate to service
        // In the future, we could add logic here to check preferences, log specific events, etc.
        return this.whatsappService.sendTemplateMessage(
            to,
            templateName,
            languageCode,
            components,
            tenantId
        );
    }
}
