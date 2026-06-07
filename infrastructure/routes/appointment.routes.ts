import { Application, Router } from "express";
import { authenticate } from "@/middleware/authenticate.middleware";
import { resolveSuperAdminTenant } from "@/middleware/super-admin-tenant-resolver.middleware";
import { AppointmentController } from "@/interface-adapters/controllers/appointment.controller";

function appointments(
    app: Application,
    appointmentController: AppointmentController,
) {
    const router = Router();
    app.use("/api/appointments", router);

    /**
     * @swagger
     * tags:
     *   name: Appointments
     *   description: Appointment management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Appointment:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         userId:
     *           type: string
     *         serviceId:
     *           type: string
     *         staffId:
     *           type: string
     *         startTime:
     *           type: string
     *           format: date-time
     *         endTime:
     *           type: string
     *           format: date-time
     *         status:
     *           type: string
     *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW]
     *         notes:
     *           type: string
     *         cancellationReason:
     *           type: string
     *         subtotal:
     *           type: number
     *         total:
     *           type: number
     *         createdAt:
     *           type: string
     *           format: date-time
     *         updatedAt:
     *           type: string
     *           format: date-time
     */

    /**
     * @swagger
     * /appointments/availability:
     *   get:
     *     summary: Get available time slots
     *     tags: [Appointments]
     *     parameters:
     *       - in: query
     *         name: serviceId
     *         required: true
     *         schema:
     *           type: string
     *         description: Service ID
     *       - in: query
     *         name: staffId
     *         schema:
     *           type: string
     *         description: Staff member ID (optional)
     *       - in: query
     *         name: date
     *         required: true
     *         schema:
     *           type: string
     *           format: date
     *         description: Date to check availability
     *     responses:
     *       200:
     *         description: Available time slots
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   startTime:
     *                     type: string
     *                     format: date-time
     *                   endTime:
     *                     type: string
     *                     format: date-time
     *                   staffId:
     *                     type: string
     *       400:
     *         description: Invalid query parameters
     */
    router.get("/availability", (req, res) =>
        appointmentController.getAvailability(req, res),
    );

    /**
     * @swagger
     * /appointments:
     *   post:
     *     summary: Create a new appointment
     *     tags: [Appointments]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateAppointmentDto'
     *     responses:
     *       201:
     *         description: Appointment created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Appointment'
     *       401:
     *         description: Unauthorized
     *       409:
     *         description: Time slot not available
     *       422:
     *         description: Invalid appointment data
     */
    router.post("/", authenticate, (req, res) =>
        appointmentController.create(req, res),
    );

    /**
     * @swagger
     * /appointments:
     *   get:
     *     summary: Get appointments with optional filters
     *     tags: [Appointments]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: userId
     *         schema:
     *           type: string
     *         description: Filter by user ID
     *       - in: query
     *         name: staffId
     *         schema:
     *           type: string
     *         description: Filter by staff ID
     *       - in: query
     *         name: serviceId
     *         schema:
     *           type: string
     *         description: Filter by service ID
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW]
     *         description: Filter by status
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
     *     responses:
     *       200:
     *         description: List of appointments
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Appointment'
     *       401:
     *         description: Unauthorized
     */
    router.get("/", authenticate, resolveSuperAdminTenant, (req, res) =>
        appointmentController.getAll(req, res),
    );

    /**
     * @swagger
     * /appointments/{id}:
     *   get:
     *     summary: Get appointment by ID
     *     tags: [Appointments]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Appointment ID
     *     responses:
     *       200:
     *         description: Appointment details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Appointment'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Appointment not found
     */
    router.get("/:id", authenticate, (req, res) =>
        appointmentController.getById(req, res),
    );

    /**
     * @swagger
     * /appointments/{id}/cancel:
     *   put:
     *     summary: Cancel an appointment
     *     tags: [Appointments]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Appointment ID
     *     requestBody:
     *       required: false
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               cancellationReason:
     *                 type: string
     *     responses:
     *       200:
     *         description: Appointment cancelled successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Appointment'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Appointment not found
     *       409:
     *         description: Appointment cannot be cancelled
     */
    router.put("/:id/cancel", authenticate, (req, res) =>
        appointmentController.cancel(req, res),
    );

    /**
     * @swagger
     * /appointments/{id}/status:
     *   put:
     *     summary: Update appointment status
     *     tags: [Appointments]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Appointment ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateAppointmentStatusDto'
     *     responses:
     *       200:
     *         description: Appointment status updated
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Appointment'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Appointment not found
     *       422:
     *         description: Invalid status transition
     */
    router.put("/:id/status", authenticate, (req, res) =>
        appointmentController.updateStatus(req, res),
    );

    /**
     * @swagger
     * /appointments/{id}:
     *   delete:
     *     summary: Delete an appointment
     *     tags: [Appointments]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Appointment ID
     *     responses:
     *       200:
     *         description: Appointment deleted successfully
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Appointment not found
     */
    router.delete("/:id", authenticate, (req, res) =>
        appointmentController.delete(req, res),
    );
}

export default appointments;
