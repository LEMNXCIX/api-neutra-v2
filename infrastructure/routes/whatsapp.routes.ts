import { Router } from "express";
import { WhatsAppWebhookController } from "@/infrastructure/webhooks/whatsapp-webhook.controller";

import { WhatsAppConfigController } from "@/interface-adapters/controllers/whatsapp-config.controller";
import { WhatsAppController } from "@/interface-adapters/controllers/whatsapp.controller";

function whatsappRoutes(
    app: any,
    whatsappWebhookController: WhatsAppWebhookController,
    whatsappConfigController: WhatsAppConfigController,
    whatsappController: WhatsAppController
) {
    const router = Router();

    /**
     * @swagger
     * tags:
     *   name: WhatsApp
     *   description: WhatsApp Business API Integration
     */

// ============================================
// Internal API Routes
// ============================================

// Configuration
/**
 * @swagger
 * /admin/whatsapp/config:
 *   get:
 *     summary: Get WhatsApp Config
 *     tags: [WhatsApp]
 */
router.get("/admin/whatsapp/config", (req, res) => whatsappConfigController.getConfig(req, res));

/**
 * @swagger
 * /admin/whatsapp/config:
 *   post:
 *     summary: Update WhatsApp Config
 *     tags: [WhatsApp]
 */
router.post("/admin/whatsapp/config", (req, res) => whatsappConfigController.updateConfig(req, res));

// Messaging
/**
 * @swagger
 * /whatsapp/send-template:
 *   post:
 *     summary: Send Template Message
 *     tags: [WhatsApp]
 */
router.post("/whatsapp/send-template", (req, res) => whatsappController.sendTemplate(req, res));

// ============================================
// Webhooks
// ============================================

// Webhook Verification (GET)

// Webhook Verification (GET)
/**
 * @swagger
 * /webhooks/whatsapp:
 *   get:
 *     summary: Verify WhatsApp Webhook
 *     tags: [WhatsApp]
 *     parameters:
 *       - in: query
 *         name: hub.mode
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: hub.verify_token
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: hub.challenge
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Webhook verified
 *       403:
 *         description: Verification failed
 */
router.get("/webhooks/whatsapp", (req, res) => whatsappWebhookController.verify(req, res));

// Webhook Events (POST)
/**
 * @swagger
 * /webhooks/whatsapp:
 *   post:
 *     summary: Handle WhatsApp Webhook Events
 *     tags: [WhatsApp]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Event received
 */
router.post("/webhooks/whatsapp", (req, res) => whatsappWebhookController.handleWebhook(req, res));

    app.use("/api", router);
}

export default whatsappRoutes;
