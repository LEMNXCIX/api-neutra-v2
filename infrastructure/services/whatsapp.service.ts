import axios, { AxiosInstance } from 'axios';
import { IWhatsAppConfigRepository } from '@/core/repositories/whatsapp-config.repository.interface';
import { IWhatsAppMessageRepository } from '@/core/repositories/whatsapp-message.repository.interface';
import logger from '@/helpers/logger.helpers';

export class WhatsAppService {
    private apiVersion: string;
    private apiBaseUrl: string;

    constructor(
        private whatsappConfigRepository: IWhatsAppConfigRepository,
        private whatsappMessageRepository: IWhatsAppMessageRepository
    ) {
        this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
        this.apiBaseUrl = process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com';
    }

    /**
     * Send a text message
     */
    async sendTextMessage(to: string, message: string, tenantId: string): Promise<string> {
        try {
            const config = await this.whatsappConfigRepository.findByTenantId(tenantId);
            if (!config || !config.enabled) {
                throw new Error('WhatsApp not configured or disabled for this tenant');
            }

            const url = `${this.apiBaseUrl}/${this.apiVersion}/${config.phoneNumberId}/messages`;

            // Decrypt token (Implementation pending, using raw for now or assume service handles it)
            const accessToken = config.accessToken;

            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: this.formatPhoneNumber(to),
                type: 'text',
                text: { preview_url: false, body: message }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const waMessageId = response.data.messages[0].id;

            // Save message to DB
            await this.whatsappMessageRepository.create({
                tenantId,
                waMessageId,
                from: config.phoneNumberId, // We should store the actual number if available
                to: to,
                type: 'text',
                content: { body: message },
                status: 'sent',
                direction: 'outbound'
            });

            return waMessageId;

        } catch (error: any) {
            logger.error(`Error sending WhatsApp message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send a template message
     */
    async sendTemplateMessage(to: string, templateName: string, languageCode: string, components: any[], tenantId: string): Promise<string> {
        try {
            const config = await this.whatsappConfigRepository.findByTenantId(tenantId);
            if (!config || !config.enabled) {
                throw new Error('WhatsApp not configured or disabled for this tenant');
            }

            const url = `${this.apiBaseUrl}/${this.apiVersion}/${config.phoneNumberId}/messages`;
            const accessToken = config.accessToken;

            const payload = {
                messaging_product: 'whatsapp',
                to: this.formatPhoneNumber(to),
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode },
                    components: components
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const waMessageId = response.data.messages[0].id;

            // Save message to DB
            await this.whatsappMessageRepository.create({
                tenantId,
                waMessageId,
                from: config.phoneNumberId,
                to: to,
                type: 'template',
                content: { templateName, components },
                status: 'sent',
                direction: 'outbound'
            });

            return waMessageId;

        } catch (error: any) {
            logger.error(`Error sending WhatsApp template: ${error.message}`);
            throw error;
        }
    }

    private formatPhoneNumber(phone: string): string {
        // Basic formatting: remove non-digits
        return phone.replace(/\D/g, '');
    }
}
