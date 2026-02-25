import { Request, Response } from 'express';
import { ProcessIncomingMessageUseCase } from '@/core/application/whatsapp/process-incoming-message.use-case';
import { WhatsAppBotService } from '@/infrastructure/services/whatsapp-bot.service';
import { WhatsAppService } from '@/infrastructure/services/whatsapp.service';
import { IWhatsAppConfigRepository } from '@/core/repositories/whatsapp-config.repository.interface';
import { IWhatsAppMessageRepository } from '@/core/repositories/whatsapp-message.repository.interface';
import { IWhatsAppConversationRepository } from '@/core/repositories/whatsapp-conversation.repository.interface';

/**
 * Controller for WhatsApp Webhooks
 * Handles verification requests and notification events from Meta
 */
export class WhatsAppWebhookController {
    constructor(
        private processIncomingMessageUseCase: ProcessIncomingMessageUseCase,
        private whatsappMessageRepo: IWhatsAppMessageRepository
    ) { }

    /**
     * Verify Webhook (GET)
     * Meta sends a GET request to verify the callback URL
     */
    async verify(req: Request, res: Response) {
        try {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challengeRaw = req.query['hub.challenge'];

            // Check if mode and token exist
            if (!mode || !token) {
                return res.status(400).json({ error: 'Missing mode or token' });
            }

            const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
            const challenge = Number(challengeRaw);

            if (!Number.isFinite(challenge)) {
                return res.status(400).json({ error: 'Invalid challenge parameter' });
            }

            if (mode === 'subscribe' && token === verifyToken) {
                console.log('WEBHOOK_VERIFIED');
                return res.status(200).send(String(challenge));
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

                                await this.processIncomingMessageUseCase.execute(messagePayload);
                            }
                        } else if (value.statuses) {
                            // Handle status updates (sent, delivered, read)
                            for (const status of value.statuses) {

                                // TODO: Update message status in DB
                                await this.whatsappMessageRepo.updateStatus(status.id, status.status);
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
