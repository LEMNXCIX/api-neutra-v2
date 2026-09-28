import { ConfigureWhatsAppUseCase } from "@/core/application/whatsapp/configure-whatsapp.use-case";
import { GetWhatsAppConfigUseCase } from "@/core/application/whatsapp/get-whatsapp-config.use-case";
import { ProcessIncomingMessageUseCase } from "@/core/application/whatsapp/process-incoming-message.use-case";
import { ProcessWhatsAppWebhookUseCase } from "@/core/application/whatsapp/process-whatsapp-webhook.use-case";
import { SendNotificationUseCase } from "@/core/application/whatsapp/send-notification.use-case";
import { WhatsAppWebhookController } from "@/infrastructure/webhooks/whatsapp-webhook.controller";
import { WhatsAppController } from "@/interface-adapters/controllers/whatsapp.controller";
import { WhatsAppConfigController } from "@/interface-adapters/controllers/whatsapp-config.controller";
import type { Runtime } from "../runtime";

export function createMessagingControllers(runtime: Runtime) {
    const r = runtime.repositories;
    const s = runtime.services;
    const p = runtime.providers;

    return {
        whatsappWebhook: new WhatsAppWebhookController(
            new ProcessWhatsAppWebhookUseCase(
                new ProcessIncomingMessageUseCase(
                    s.whatsappBot,
                    r.whatsappConfig,
                ),
                r.whatsappMessage,
            ),
            p.logger,
        ),
        whatsappConfig: new WhatsAppConfigController(
            new GetWhatsAppConfigUseCase(r.whatsappConfig),
            new ConfigureWhatsAppUseCase(r.whatsappConfig, r.feature),
        ),
        whatsapp: new WhatsAppController(
            new SendNotificationUseCase(s.whatsapp),
        ),
    };
}
