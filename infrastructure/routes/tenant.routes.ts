import { Application, Router } from "express";
import { TenantController } from "../../interface-adapters/controllers/tenant.controller";
import { authenticate } from "@/middleware/authenticate.middleware";

function tenants(app: Application, tenantController: TenantController) {
    const router = Router();

    /**
     * @swagger
     * tags:
     *   name: Tenants
     *   description: Tenant management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Tenant:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         name:
     *           type: string
     *         slug:
     *           type: string
     *         type:
     *           type: string
     *           enum: [STORE, BOOKING, HYBRID]
     *         config:
     *           type: object
     *         active:
     *           type: boolean
     *         planId:
     *           type: string
     *         createdAt:
     *           type: string
     *           format: date-time
     *         updatedAt:
     *           type: string
     *           format: date-time
     *     TenantFeatureItem:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         featureId:
     *           type: string
     *         feature:
     *           type: object
     *           properties:
     *             key:
     *               type: string
     *             name:
     *               type: string
     *             description:
     *               type: string
     *             category:
     *               type: string
     *         enabled:
     *           type: boolean
     */

    /**
     * @swagger
     * /tenants/config/{slug}:
     *   get:
     *     summary: Get tenant configuration by slug
     *     tags: [Tenants]
     *     parameters:
     *       - in: path
     *         name: slug
     *         required: true
     *         schema:
     *           type: string
     *         description: Tenant slug identifier
     *     responses:
     *       200:
     *         description: Tenant configuration
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Tenant'
     *       404:
     *         description: Tenant not found
     */
    router.get("/config/:slug", (req, res) =>
        tenantController.getBySlug(req, res),
    );

    /**
     * @swagger
     * /tenants:
     *   get:
     *     summary: Get all tenants
     *     tags: [Tenants]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of tenants
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Tenant'
     *       401:
     *         description: Unauthorized
     */
    router.get("/", authenticate, (req, res) =>
        tenantController.getAll(req, res),
    );

    /**
     * @swagger
     * /tenants:
     *   post:
     *     summary: Create a new tenant
     *     tags: [Tenants]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateTenantDto'
     *     responses:
     *       201:
     *         description: Tenant created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Tenant'
     *       401:
     *         description: Unauthorized
     *       409:
     *         description: Tenant with this slug already exists
     */
    router.post("/", authenticate, (req, res) =>
        tenantController.create(req, res),
    );

    /**
     * @swagger
     * /tenants/{id}/features:
     *   get:
     *     summary: Get tenant features
     *     tags: [Tenants]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Tenant ID
     *     responses:
     *       200:
     *         description: List of tenant features
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/TenantFeatureItem'
     *       404:
     *         description: Tenant not found
     */
    router.get("/:id/features", (req, res) =>
        tenantController.getFeatures(req, res),
    );

    /**
     * @swagger
     * /tenants/{id}/features:
     *   put:
     *     summary: Update tenant features
     *     tags: [Tenants]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Tenant ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateTenantFeaturesDto'
     *     responses:
     *       200:
     *         description: Features updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/TenantFeatureItem'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Tenant not found
     */
    router.put("/:id/features", authenticate, (req, res) =>
        tenantController.updateFeatures(req, res),
    );

    /**
     * @swagger
     * /tenants/{id}:
     *   get:
     *     summary: Get tenant by ID
     *     tags: [Tenants]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Tenant ID
     *     responses:
     *       200:
     *         description: Tenant details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Tenant'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Tenant not found
     */
    router.get("/:id", authenticate, (req, res) =>
        tenantController.getById(req, res),
    );

    /**
     * @swagger
     * /tenants/{id}:
     *   put:
     *     summary: Update a tenant
     *     tags: [Tenants]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Tenant ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateTenantDto'
     *     responses:
     *       200:
     *         description: Tenant updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Tenant'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Tenant not found
     *       409:
     *         description: Slug already in use
     */
    router.put("/:id", authenticate, (req, res) =>
        tenantController.update(req, res),
    );

    /**
     * @swagger
     * /tenants/{id}:
     *   delete:
     *     summary: Delete a tenant
     *     tags: [Tenants]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Tenant ID
     *     responses:
     *       200:
     *         description: Tenant deleted successfully
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Tenant not found
     */
    router.delete("/:id", authenticate, (req, res) =>
        tenantController.delete(req, res),
    );

    app.use("/api/tenants", router);
}

export default tenants;
