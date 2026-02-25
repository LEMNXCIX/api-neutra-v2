import { Request, Response } from 'express';
import { SendNotificationUseCase } from '@/core/application/whatsapp/send-notification.use-case';
import { WhatsAppService } from '@/infrastructure/services/whatsapp.service';
import { IWhatsAppConfigRepository } from '@/core/repositories/whatsapp-config.repository.interface';
import { IWhatsAppMessageRepository } from '@/core/repositories/whatsapp-message.repository.interface';

export class WhatsAppController {
    constructor(
        private sendNotificationUseCase: SendNotificationUseCase
    ) { }

    /**
     * Send Template Message
     * POST /api/whatsapp/send-template
     */
    async sendTemplate(req: Request, res: Response) {
        try {
            const tenantId = req.headers['x-tenant-id'] as string;
            const { to, templateName, languageCode, components } = req.body;

            if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
            if (!to || !templateName) return res.status(400).json({ error: 'Missing required fields' });

            const messageId = await this.sendNotificationUseCase.execute({
                tenantId,
                to,
                templateName,
                languageCode,
                components
            });

            return res.status(200).json({ success: true, messageId });

        } catch (error: any) {
            console.error('Error sending message:', error);
            return res.status(500).json({ error: error.message || 'Failed to send message' });
        }
    }
}
