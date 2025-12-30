import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ProcessIncomingMessageUseCase } from '@/core/application/whatsapp/process-incoming-message.use-case';
import { WhatsAppBotService } from '@/infrastructure/services/whatsapp-bot.service';
import { WhatsAppService } from '@/infrastructure/services/whatsapp.service';
import { WhatsAppConfigPrismaRepository } from '@/infrastructure/database/prisma/whatsapp-config.prisma-repository';
import { WhatsAppMessagePrismaRepository } from '@/infrastructure/database/prisma/whatsapp-message.prisma-repository';
import { WhatsAppConversationPrismaRepository } from '@/infrastructure/database/prisma/whatsapp-conversation.prisma-repository';

// Instantiate dependencies (Simple Manual DI)
// In a real production app, use a DI container like InversifyJS or NestJS
const prisma = new PrismaClient();
const whatsappConfigRepo = new WhatsAppConfigPrismaRepository(prisma);
const whatsappMessageRepo = new WhatsAppMessagePrismaRepository(prisma);
const whatsappConversationRepo = new WhatsAppConversationPrismaRepository(prisma);

const whatsappService = new WhatsAppService(whatsappConfigRepo, whatsappMessageRepo);
const whatsappBotService = new WhatsAppBotService(whatsappConversationRepo, whatsappMessageRepo, whatsappService);
const processIncomingMessageUseCase = new ProcessIncomingMessageUseCase(whatsappBotService, whatsappConfigRepo);

/**
 * Controller for WhatsApp Webhooks
 * Handles verification requests and notification events from Meta
 */
export class WhatsAppWebhookController {

    /**
     * Verify Webhook (GET)
     * Meta sends a GET request to verify the callback URL
     */
    async verify(req: Request, res: Response) {
        try {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            // Check if mode and token exist
            if (!mode || !token) {
                return res.status(400).json({ error: 'Missing mode or token' });
            }

            const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

            if (mode === 'subscribe' && token === verifyToken) {
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(challenge);
            } else {
                return res.status(403).json({ error: 'Verification failed' });
            }

        } catch (error) {
            console.error('Error in webhook verification:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Handle Incoming Events (POST)
     * Receives messages, status updates, etc.
     */
    async handleWebhook(req: Request, res: Response) {
        try {
            const body = req.body;

            // Check if this is an event from a WhatsApp API
            if (body.object === 'whatsapp_business_account') {

                // Iterate over entries (usually one)
                for (const entry of body.entry) {

                    // Changes array
                    for (const change of entry.changes) {
                        const value = change.value;

                        if (value.messages) {
                            // Handle incoming messages
                            for (const message of value.messages) {

                                // Construct payload with metadata
                                const messagePayload = {
                                    ...message,
                                    metadata: value.metadata // Contains display_phone_number and phone_number_id
                                };

                                await processIncomingMessageUseCase.execute(messagePayload);
                            }
                        } else if (value.statuses) {
                            // Handle status updates (sent, delivered, read)
                            for (const status of value.statuses) {

                                // TODO: Update message status in DB
                                await whatsappMessageRepo.updateStatus(status.id, status.status);
                            }
                        }
                    }
                }

                return res.status(200).send('EVENT_RECEIVED');
            } else {
                // Return 404 if this is not a WhatsApp API event
                return res.status(404).json({ error: 'Not a WhatsApp API event' });
            }

        } catch (error) {
            console.error('Error processing webhook:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
