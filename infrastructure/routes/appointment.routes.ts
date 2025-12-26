import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { AppointmentController } from '@/interface-adapters/controllers/appointment.controller';
import { PrismaAppointmentRepository } from '@/infrastructure/database/prisma/appointment.prisma-repository';
import { PrismaStaffRepository } from '@/infrastructure/database/prisma/staff.prisma-repository';
import { PrismaServiceRepository } from '@/infrastructure/database/prisma/service.prisma-repository';
import { PrismaCouponRepository } from '@/infrastructure/database/prisma/coupon.prisma-repository';
import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';
import { BullMQQueueProvider } from '@/infrastructure/providers/bullmq-queue.provider';

function appointments(app: Application) {
    const router = Router();
    const appointmentRepository = new PrismaAppointmentRepository();
    const staffRepository = new PrismaStaffRepository();
    const serviceRepository = new PrismaServiceRepository();
    const couponRepository = new PrismaCouponRepository();
    const logger = new PinoLoggerProvider();
    const queueProvider = new BullMQQueueProvider();

    const appointmentController = new AppointmentController(
        appointmentRepository,
        staffRepository,
        serviceRepository,
        couponRepository,
        logger,
        queueProvider
    );


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
}

export default appointments;
