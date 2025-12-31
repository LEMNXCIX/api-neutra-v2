import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SendNotificationUseCase } from '@/core/application/whatsapp/send-notification.use-case';
import { WhatsAppService } from '@/infrastructure/services/whatsapp.service';
import { WhatsAppConfigPrismaRepository } from '@/infrastructure/database/prisma/whatsapp-config.prisma-repository';
import { WhatsAppMessagePrismaRepository } from '@/infrastructure/database/prisma/whatsapp-message.prisma-repository';

// Manual DI
const prisma = new PrismaClient();
const configRepo = new WhatsAppConfigPrismaRepository(prisma);
const messageRepo = new WhatsAppMessagePrismaRepository(prisma);
const whatsappService = new WhatsAppService(configRepo, messageRepo);
const sendNotificationUseCase = new SendNotificationUseCase(whatsappService);

export class WhatsAppController {

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

            const messageId = await sendNotificationUseCase.execute({
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
