import { Application, Router } from "express";
import { authenticate } from "@/middleware/authenticate.middleware";
import { requirePermission } from "@/middleware/authorization.middleware";
import { resolveSuperAdminTenant } from "@/middleware/super-admin-tenant-resolver.middleware";
import { StaffController } from "@/interface-adapters/controllers/staff.controller";

function staff(app: Application, staffController: StaffController) {
    const router = Router();
    app.use("/api/staff", router);

    /**
     * @swagger
     * tags:
     *   name: Staff
     *   description: Staff member management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Staff:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         name:
     *           type: string
     *         email:
     *           type: string
     *           format: email
     *         phone:
     *           type: string
     *         avatar:
     *           type: string
     *         bio:
     *           type: string
     *         active:
     *           type: boolean
     *         workingHours:
     *           type: object
     *         userId:
     *           type: string
     *         createdAt:
     *           type: string
     *           format: date-time
     *         updatedAt:
     *           type: string
     *           format: date-time
     */

    /**
     * @swagger
     * /staff/me:
     *   get:
     *     summary: Get current user's staff profile
     *     tags: [Staff]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Staff profile
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Staff'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Staff profile not found for current user
     */
    router.get("/me", authenticate, (req, res) =>
        staffController.getMe(req, res),
    );

    /**
     * @swagger
     * /staff:
     *   post:
     *     summary: Create a new staff member
     *     tags: [Staff]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateStaffDto'
     *     responses:
     *       201:
     *         description: Staff member created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Staff'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       409:
     *         description: Staff member already exists
     */
    router.post(
        "/",
        authenticate,
        requirePermission("staff:write"),
        (req, res) => staffController.create(req, res),
    );

    /**
     * @swagger
     * /staff:
     *   get:
     *     summary: Get all staff members
     *     tags: [Staff]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: activeOnly
     *         schema:
     *           type: boolean
     *           default: true
     *         description: Filter by active status
     *     responses:
     *       200:
     *         description: List of staff members
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Staff'
     *       401:
     *         description: Unauthorized
     */
    router.get("/", authenticate, resolveSuperAdminTenant, (req, res) =>
        staffController.getAll(req, res),
    );

    /**
     * @swagger
     * /staff/{staffId}/services:
     *   post:
     *     summary: Assign a service to a staff member
     *     tags: [Staff]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: staffId
     *         required: true
     *         schema:
     *           type: string
     *         description: Staff member ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AssignStaffServiceDto'
     *     responses:
     *       200:
     *         description: Service assigned successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Staff member or service not found
     *       409:
     *         description: Service already assigned
     */
    router.post(
        "/:staffId/services",
        authenticate,
        requirePermission("staff:write"),
        (req, res) => staffController.assignService(req, res),
    );

    /**
     * @swagger
     * /staff/{staffId}/services:
     *   put:
     *     summary: Sync all services for a staff member
     *     tags: [Staff]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: staffId
     *         required: true
     *         schema:
     *           type: string
     *         description: Staff member ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SyncStaffServicesDto'
     *     responses:
     *       200:
     *         description: Services synced successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Staff member not found
     */
    router.put(
        "/:staffId/services",
        authenticate,
        requirePermission("staff:write"),
        (req, res) => staffController.syncServices(req, res),
    );

    /**
     * @swagger
     * /staff/{id}:
     *   put:
     *     summary: Update a staff member
     *     tags: [Staff]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Staff member ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateStaffDto'
     *     responses:
     *       200:
     *         description: Staff member updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Staff'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Staff member not found
     */
    router.put(
        "/:id",
        authenticate,
        requirePermission("staff:write"),
        (req, res) => staffController.update(req, res),
    );

    /**
     * @swagger
     * /staff/{id}:
     *   delete:
     *     summary: Delete a staff member
     *     tags: [Staff]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Staff member ID
     *     responses:
     *       200:
     *         description: Staff member deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Staff member not found
     */
    router.delete(
        "/:id",
        authenticate,
        requirePermission("staff:write"),
        (req, res) => staffController.delete(req, res),
    );
}

export default staff;
