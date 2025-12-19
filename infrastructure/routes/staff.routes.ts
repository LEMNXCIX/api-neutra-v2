import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { StaffController } from '@/interface-adapters/controllers/staff.controller';
import { PrismaStaffRepository } from '@/infrastructure/database/prisma/staff.prisma-repository';
import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';

function staff(app: Application) {
    const router = Router();
    const staffRepository = new PrismaStaffRepository();
    const logger = new PinoLoggerProvider();
    const staffController = new StaffController(staffRepository, logger);

    app.use('/api/staff', router);

    /**
     * @route POST /api/staff
     * @desc Create a new staff member
     * @access Admin only
     */
    router.post(
        '/',
        authenticate,
        requirePermission('staff:write'),
        (req, res) => staffController.create(req, res)
    );

    /**
     * @route GET /api/staff
     * @desc Get all staff members
     * @query activeOnly - Filter by active status (default: true)
     * @access Public
     */
    router.get(
        '/',
        (req, res) => staffController.getAll(req, res)
    );

    /**
     * @route POST /api/staff/:staffId/services
     * @desc Assign a service to a staff member
     * @access Admin only
     */
    router.post(
        '/:staffId/services',
        authenticate,
        requirePermission('staff:write'),
        (req, res) => staffController.assignService(req, res)
    );

    /**
     * @route PUT /api/staff/:id
     * @desc Update a staff member
     * @access Admin only
     */
    router.put(
        '/:id',
        authenticate,
        requirePermission('staff:write'),
        (req, res) => staffController.update(req, res)
    );

    /**
     * @route DELETE /api/staff/:id
     * @desc Delete a staff member
     * @access Admin only
     */
    router.delete(
        '/:id',
        authenticate,
        requirePermission('staff:write'),
        (req, res) => staffController.delete(req, res)
    );
}

export default staff;
