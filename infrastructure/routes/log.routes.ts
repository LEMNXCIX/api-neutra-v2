import { Application, Router } from "express";
import { LogController } from "@/interface-adapters/controllers/log.controller";
import { authenticate } from "@/middleware/authenticate.middleware";
import { requirePermission } from "@/middleware/authorization.middleware";

export default function logRoutes(app: Application, controller: LogController) {
    const router = Router();
    app.use("/api/admin", router);

    /**
     * @swagger
     * tags:
     *   name: Admin Logs
     *   description: System log management (Admin only)
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Log:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         timestamp:
     *           type: string
     *           format: date-time
     *         level:
     *           type: string
     *           enum: [DEBUG, INFO, WARN, ERROR, FATAL]
     *         method:
     *           type: string
     *         url:
     *           type: string
     *         statusCode:
     *           type: integer
     *         duration:
     *           type: integer
     *           description: Duration in milliseconds
     *         tenantId:
     *           type: string
     *         userId:
     *           type: string
     *         ip:
     *           type: string
     *         userAgent:
     *           type: string
     *         message:
     *           type: string
     *         metadata:
     *           type: object
     *         error:
     *           type: object
     *         traceId:
     *           type: string
     */

    /**
     * @swagger
     * /admin/logs:
     *   get:
     *     summary: Get all system logs
     *     tags: [Admin Logs]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: level
     *         schema:
     *           type: string
     *           enum: [DEBUG, INFO, WARN, ERROR, FATAL]
     *         description: Filter by log level
     *       - in: query
     *         name: tenantId
     *         schema:
     *           type: string
     *         description: Filter by tenant ID
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date-time
     *         description: Filter from date
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date-time
     *         description: Filter to date
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *         description: Page number for pagination
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         description: Number of items per page
     *     responses:
     *       200:
     *         description: List of system logs
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Log'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get(
        "/logs",
        authenticate,
        requirePermission("features:read"),
        (req, res) => controller.getAll(req, res),
    );

    /**
     * @swagger
     * /admin/logs/stats:
     *   get:
     *     summary: Get log statistics
     *     tags: [Admin Logs]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Log statistics
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 total:
     *                   type: integer
     *                 byLevel:
     *                   type: object
     *                   properties:
     *                     DEBUG:
     *                       type: integer
     *                     INFO:
     *                       type: integer
     *                     WARN:
     *                       type: integer
     *                     ERROR:
     *                       type: integer
     *                     FATAL:
     *                       type: integer
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get(
        "/logs/stats",
        authenticate,
        requirePermission("features:read"),
        (req, res) => controller.getStats(req, res),
    );
}
