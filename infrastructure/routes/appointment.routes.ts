import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { AppointmentController } from '@/interface-adapters/controllers/appointment.controller';

function appointments(app: Application, appointmentController: AppointmentController) {
    const router = Router();
    app.use('/api/appointments', router);

    /**
     * @route POST /api/appointments
     * @desc Create a new appointment
     * @access Authenticated users
     */

    /**
     * @route GET /api/appointments/availability
     * @desc Get available time slots
     * @access Public
     */
    router.get(
        '/availability',
        // Public access, so no authenticate middleware here if we want anyone to see availability
        // But we DO need tenant middleware which is global in app.ts usually.
        (req, res) => appointmentController.getAvailability(req, res)
    );

    router.post(
        '/',
        authenticate,
        (req, res) => appointmentController.create(req, res)
    );

    /**
     * @route GET /api/appointments
     * @desc Get appointments with optional filters
     * @query userId, staffId, serviceId, status, startDate, endDate
     * @access Authenticated users (own appointments) or Admin (all appointments)
     */
    router.get(
        '/',
        authenticate,
        (req, res) => appointmentController.getAll(req, res)
    );

    /**
     * @route GET /api/appointments/:id
     * @desc Get appointment by ID
     * @access Authenticated users (own appointment) or Admin
     */
    router.get(
        '/:id',
        authenticate,
        (req, res) => appointmentController.getById(req, res)
    );

    /**
     * @route PUT /api/appointments/:id/cancel
     * @desc Cancel an appointment
     * @access Authenticated users (own appointment) or Admin
     */
    router.put(
        '/:id/cancel',
        authenticate,
        (req, res) => appointmentController.cancel(req, res)
    );

    router.put(
        '/:id/status',
        authenticate,
        (req, res) => appointmentController.updateStatus(req, res)
    );

    router.delete(
        '/:id',
        authenticate,
        (req, res) => appointmentController.delete(req, res)
    );
}

export default appointments;
