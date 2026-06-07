import { Application, Router } from "express";
import { authenticate } from "@/middleware/authenticate.middleware";
import { optionalAuthenticate } from "@/middleware/optional-authenticate.middleware";
import { requirePermission } from "@/middleware/authorization.middleware";
import { resolveSuperAdminTenant } from "@/middleware/super-admin-tenant-resolver.middleware";
import { ServiceController } from "@/interface-adapters/controllers/service.controller";

function services(app: Application, serviceController: ServiceController) {
    const router = Router();
    app.use("/api/services", router);

    /**
     * @swagger
     * tags:
     *   name: Services
     *   description: Service management (Booking module)
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Service:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         name:
     *           type: string
     *         description:
     *           type: string
     *         duration:
     *           type: integer
     *           description: Duration in minutes
     *         price:
     *           type: number
     *         categoryId:
     *           type: string
     *         active:
     *           type: boolean
     *         createdAt:
     *           type: string
     *           format: date-time
     *         updatedAt:
     *           type: string
     *           format: date-time
     */

    /**
     * @swagger
     * /services:
     *   post:
     *     summary: Create a new service
     *     tags: [Services]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateServiceDto'
     *     responses:
     *       201:
     *         description: Service created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Service'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       409:
     *         description: Service with this name already exists
     */
    router.post(
        "/",
        authenticate,
        requirePermission("services:write"),
        (req, res) => serviceController.create(req, res),
    );

    /**
     * @swagger
     * /services:
     *   get:
     *     summary: Get all services
     *     tags: [Services]
     *     parameters:
     *       - in: query
     *         name: activeOnly
     *         schema:
     *           type: boolean
     *           default: true
     *         description: Filter by active status
     *     responses:
     *       200:
     *         description: List of services
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Service'
     */
    router.get("/", optionalAuthenticate, resolveSuperAdminTenant, (req, res) =>
        serviceController.getAll(req, res),
    );

    /**
     * @swagger
     * /services/{id}:
     *   put:
     *     summary: Update a service
     *     tags: [Services]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Service ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateServiceDto'
     *     responses:
     *       200:
     *         description: Service updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Service'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Service not found
     */
    router.put(
        "/:id",
        authenticate,
        requirePermission("services:write"),
        (req, res) => serviceController.update(req, res),
    );

    /**
     * @swagger
     * /services/{id}:
     *   delete:
     *     summary: Delete a service
     *     tags: [Services]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Service ID
     *     responses:
     *       200:
     *         description: Service deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Service not found
     */
    router.delete(
        "/:id",
        authenticate,
        requirePermission("services:write"),
        (req, res) => serviceController.delete(req, res),
    );
}

export default services;
