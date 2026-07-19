import { Request, Response } from "express";
import { ProcessWhatsAppWebhookUseCase } from "@/core/application/whatsapp/process-whatsapp-webhook.use-case";
import config from "@/config/index.config";

/**
 * Thin HTTP adapter for Meta WhatsApp webhooks.
 * Verification token comes from centralized config; event handling lives in the use case.
 */
export class WhatsAppWebhookController {
    constructor(
        private processWhatsAppWebhookUseCase: ProcessWhatsAppWebhookUseCase,
    ) {}

    /**
     * Verify Webhook (GET)
     * Meta sends a GET request to verify the callback URL
     */
    async verify(req: Request, res: Response) {
        try {
            const mode = req.query["hub.mode"];
            const token = req.query["hub.verify_token"];
            const challengeRaw = req.query["hub.challenge"];

            if (!mode || !token) {
                return res.status(400).json({ error: "Missing mode or token" });
            }

            const verifyToken = config.whatsappVerifyToken;
            const challenge = Number(challengeRaw);

            if (!Number.isFinite(challenge)) {
                return res
                    .status(400)
                    .json({ error: "Invalid challenge parameter" });
            }

            if (mode === "subscribe" && token === verifyToken) {
                return res.status(200).send(String(challenge));
            }

            return res.status(403).json({ error: "Verification failed" });
        } catch {
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }

    /**
     * Handle Incoming Events (POST)
     */
    async handleWebhook(req: Request, res: Response) {
        try {
            const result = await this.processWhatsAppWebhookUseCase.execute(
                req.body,
            );

            if (!result.handled) {
                return res
                    .status(404)
                    .json({ error: "Not a WhatsApp API event" });
            }

            return res.status(200).send("EVENT_RECEIVED");
        } catch {
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }
}
