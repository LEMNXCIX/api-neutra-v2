import { Application, Router } from "express";
import type { RequestHandler } from "express";
import {
    requirePermission,
    requireSuperAdmin,
} from "@/middleware/authorization.middleware";
import { FeatureController } from "@/interface-adapters/controllers/feature.controller";
import { validateDto } from "@/middleware/validation.middleware";
import {
    CreateFeatureDto,
    UpdateFeatureDto,
} from "@/core/application/dtos/requests/feature.request";

function featureRoutes(
    app: Application,
    featureController: FeatureController,
    authenticate: RequestHandler,
) {
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
     * The three writes below are platform-catalog mutations: `Feature` carries
     * no `tenantId` and `key` is globally `@unique`, so a write here is visible
     * to every tenant's `getTenantFeatureStatus` gating. `requirePermission` is
     * kept alongside `requireSuperAdmin` as a conjunction on purpose — the
     * permission names the capability, the role names the operator who is
     * allowed to act outside a tenant, and dropping either lets through a
     * different class of caller.
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
        requireSuperAdmin,
        validateDto(CreateFeatureDto),
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
        requireSuperAdmin,
        validateDto(UpdateFeatureDto),
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
        requireSuperAdmin,
        featureController.delete,
    );
}

export default featureRoutes;
