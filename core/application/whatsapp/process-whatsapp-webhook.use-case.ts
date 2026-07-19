import { ProcessIncomingMessageUseCase } from "@/core/application/whatsapp/process-incoming-message.use-case";
import { IWhatsAppMessageRepository } from "@/core/repositories/whatsapp-message.repository.interface";
import { IncomingWhatsAppMessage } from "@/core/ports/whatsapp-bot-service.interface";

export type WhatsAppWebhookBody = {
    object?: string;
    entry?: Array<{
        changes?: Array<{
            value?: {
                messages?: IncomingWhatsAppMessage[];
                statuses?: Array<{ id: string; status: string }>;
                metadata?: Record<string, unknown>;
            };
        }>;
    }>;
};

export type ProcessWhatsAppWebhookResult =
    | { handled: true }
    | { handled: false; reason: "not_whatsapp_event" };

/**
 * Orchestrates Meta WhatsApp webhook events (messages + delivery statuses).
 * Keeps HTTP adapters free of payload tree walking and repository calls.
 */
export class ProcessWhatsAppWebhookUseCase {
    constructor(
        private processIncomingMessageUseCase: ProcessIncomingMessageUseCase,
        private whatsappMessageRepository: IWhatsAppMessageRepository,
    ) {}

    async execute(
        body: WhatsAppWebhookBody,
    ): Promise<ProcessWhatsAppWebhookResult> {
        if (body.object !== "whatsapp_business_account") {
            return { handled: false, reason: "not_whatsapp_event" };
        }

        for (const entry of body.entry ?? []) {
            for (const change of entry.changes ?? []) {
                const value = change.value;
                if (!value) continue;

                if (value.messages?.length) {
                    for (const message of value.messages) {
                        const messagePayload: IncomingWhatsAppMessage = {
                            ...message,
                            metadata: value.metadata,
                        };
                        await this.processIncomingMessageUseCase.execute(
                            messagePayload,
                        );
                    }
                } else if (value.statuses?.length) {
                    for (const status of value.statuses) {
                        if (status.id && status.status) {
                            await this.whatsappMessageRepository.updateStatus(
                                status.id,
                                status.status,
                            );
                        }
                    }
                }
            }
        }

        return { handled: true };
    }
}
