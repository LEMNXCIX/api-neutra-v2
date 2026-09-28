import type { Application } from "express";
import type { HealthController } from "@/interface-adapters/controllers/health.controller";

/**
 * Public process and dependency health endpoints.
 */
export function healthRoutes(
    app: Application,
    controller: HealthController,
): void {
    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Process liveness
     *     description: Returns 200 while the process is running, without checking dependencies.
     *     tags: [Health]
     *     security: []
     *     responses:
     *       200:
     *         description: Process is alive
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               required: [status]
     *               properties:
     *                 status:
     *                   type: string
     *                   example: ok
     */

    /**
     * @swagger
     * /ready:
     *   get:
     *     summary: Dependency readiness
     *     description: Returns 200 only when the database and Redis are available.
     *     tags: [Health]
     *     security: []
     *     responses:
     *       200:
     *         description: All dependencies are ready
     *       503:
     *         description: One or more dependencies are unavailable
     */
    app.get("/health", controller.health);
    app.get("/ready", controller.ready);
}

export default healthRoutes;
