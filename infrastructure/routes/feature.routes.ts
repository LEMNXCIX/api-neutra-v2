import { Application, Router } from "express";
import { authenticate } from "@/middleware/authenticate.middleware";
import { requirePermission } from "@/middleware/authorization.middleware";
import { FeatureController } from "@/interface-adapters/controllers/feature.controller";

function featureRoutes(app: Application, featureController: FeatureController) {
    const router = Router();
    app.use("/api/features", router);

    /**
     * @swagger
     * tags:
     *   name: Features
     *   description: Available system features management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Feature:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         key:
     *           type: string
     *         name:
     *           type: string
     *         description:
     *           type: string
     *         category:
     *           type: string
     *           enum: [MODULE, INTEGRATION, CUSTOMIZATION]
     *         price:
     *           type: number
     *         createdAt:
     *           type: string
     *           format: date-time
     */

    /**
     * @swagger
     * /features:
     *   get:
     *     summary: Get all available features
     *     tags: [Features]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of features
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Feature'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get(
        "/",
        authenticate,
        requirePermission("features:read"),
        featureController.getAll,
    );

    /**
     * @swagger
     * /features:
     *   post:
     *     summary: Create a new feature
     *     tags: [Features]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateFeatureDto'
     *     responses:
     *       201:
     *         description: Feature created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Feature'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       409:
     *         description: Feature with this key already exists
     */
    router.post(
        "/",
        authenticate,
        requirePermission("features:write"),
        featureController.create,
    );

    /**
     * @swagger
     * /features/{id}:
     *   put:
     *     summary: Update a feature
     *     tags: [Features]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Feature ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateFeatureDto'
     *     responses:
     *       200:
     *         description: Feature updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Feature'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Feature not found
     */
    router.put(
        "/:id",
        authenticate,
        requirePermission("features:write"),
        featureController.update,
    );

    /**
     * @swagger
     * /features/{id}:
     *   delete:
     *     summary: Delete a feature
     *     tags: [Features]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Feature ID
     *     responses:
     *       200:
     *         description: Feature deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Feature not found
     */
    router.delete(
        "/:id",
        authenticate,
        requirePermission("features:delete"),
        featureController.delete,
    );
}

export default featureRoutes;
