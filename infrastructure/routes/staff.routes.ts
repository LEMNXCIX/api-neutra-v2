import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { StaffController } from '@/interface-adapters/controllers/staff.controller';
import { PrismaStaffRepository } from '@/infrastructure/database/prisma/staff.prisma-repository';
import { PrismaUserRepository } from '@/infrastructure/database/prisma/user.prisma-repository';
import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';

function staff(app: Application) {
    const router = Router();
    const staffRepository = new PrismaStaffRepository();
    const userRepository = new PrismaUserRepository();
    const logger = new PinoLoggerProvider();
    const staffController = new StaffController(staffRepository, userRepository, logger);

    app.use('/api/staff', router);

    /**
     * @route GET /api/staff/me
     * @desc Get current user's staff profile
     * @access Authenticated
     */
    router.get(
        '/me',
        authenticate,
        (req, res) => staffController.getMe(req, res)
    );

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
     * @access Authenticated (Public for regular users, all tenants for SUPER_ADMIN)
     */
    router.get(
        '/',
        authenticate,
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
     * @route PUT /api/staff/:staffId/services
     * @desc Sync all services for a staff member
     * @access Admin only
     */
    router.put(
        '/:staffId/services',
        authenticate,
        requirePermission('staff:write'),
        (req, res) => staffController.syncServices(req, res)
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
