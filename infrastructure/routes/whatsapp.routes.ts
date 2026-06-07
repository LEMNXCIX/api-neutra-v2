import { Router } from "express";
import { WhatsAppWebhookController } from "@/infrastructure/webhooks/whatsapp-webhook.controller";

import { WhatsAppConfigController } from "@/interface-adapters/controllers/whatsapp-config.controller";
import { WhatsAppController } from "@/interface-adapters/controllers/whatsapp.controller";

function whatsappRoutes(
    app: any,
    whatsappWebhookController: WhatsAppWebhookController,
    whatsappConfigController: WhatsAppConfigController,
    whatsappController: WhatsAppController,
) {
    const router = Router();

    /**
     * @swagger
     * tags:
     *   name: WhatsApp
     *   description: WhatsApp Business API Integration
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     WhatsAppConfig:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         tenantId:
     *           type: string
     *         phoneNumberId:
     *           type: string
     *         businessAccountId:
     *           type: string
     *         enabled:
     *           type: boolean
     *         notificationsEnabled:
     *           type: boolean
     *         botEnabled:
     *           type: boolean
     *         templates:
     *           type: object
     *         botConfig:
     *           type: object
     *         createdAt:
     *           type: string
     *           format: date-time
     *         updatedAt:
     *           type: string
     *           format: date-time
     *     WhatsAppMessage:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         tenantId:
     *           type: string
     *         waMessageId:
     *           type: string
     *         waConversationId:
     *           type: string
     *         from:
     *           type: string
     *         to:
     *           type: string
     *         type:
     *           type: string
     *         content:
     *           type: object
     *         status:
     *           type: string
     *         direction:
     *           type: string
     *         createdAt:
     *           type: string
     *           format: date-time
     *     WhatsAppConversation:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         tenantId:
     *           type: string
     *         waConversationId:
     *           type: string
     *         phoneNumber:
     *           type: string
     *         userId:
     *           type: string
     *         status:
     *           type: string
     *         context:
     *           type: object
     *         lastMessageAt:
     *           type: string
     *           format: date-time
     *         createdAt:
     *           type: string
     *           format: date-time
     */

    /**
     * @swagger
     * /admin/whatsapp/config:
     *   get:
     *     summary: Get WhatsApp configuration
     *     tags: [WhatsApp]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: WhatsApp configuration
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/WhatsAppConfig'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Configuration not found
     */
    router.get("/admin/whatsapp/config", (req, res) =>
        whatsappConfigController.getConfig(req, res),
    );

    /**
     * @swagger
     * /admin/whatsapp/config:
     *   post:
     *     summary: Update WhatsApp configuration
     *     tags: [WhatsApp]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/WhatsAppConfigDto'
     *     responses:
     *       200:
     *         description: Configuration updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/WhatsAppConfig'
     *       401:
     *         description: Unauthorized
     *       400:
     *         description: Invalid configuration data
     */
    router.post("/admin/whatsapp/config", (req, res) =>
        whatsappConfigController.updateConfig(req, res),
    );

    /**
     * @swagger
     * /whatsapp/send-template:
     *   post:
     *     summary: Send a WhatsApp template message
     *     tags: [WhatsApp]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SendWhatsAppTemplateDto'
     *     responses:
     *       200:
     *         description: Template message sent successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/WhatsAppMessage'
     *       401:
     *         description: Unauthorized
     *       400:
     *         description: Invalid template or recipient
     *       422:
     *         description: WhatsApp not configured or disabled
     */
    router.post("/whatsapp/send-template", (req, res) =>
        whatsappController.sendTemplate(req, res),
    );

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
     *         description: Subscription mode (subscribe)
     *       - in: query
     *         name: hub.verify_token
     *         schema:
     *           type: string
     *         required: true
     *         description: Verification token
     *       - in: query
     *         name: hub.challenge
     *         schema:
     *           type: string
     *         required: true
     *         description: Challenge string to echo back
     *     responses:
     *       200:
     *         description: Webhook verified
     *       403:
     *         description: Verification failed
     */
    router.get("/webhooks/whatsapp", (req, res) =>
        whatsappWebhookController.verify(req, res),
    );

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
     *             description: WhatsApp webhook event payload
     *     responses:
     *       200:
     *         description: Event received and processed
     */
    router.post("/webhooks/whatsapp", (req, res) =>
        whatsappWebhookController.handleWebhook(req, res),
    );

    app.use("/api", router);
}

export default whatsappRoutes;
