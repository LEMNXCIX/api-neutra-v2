import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { ServiceController } from '@/interface-adapters/controllers/service.controller';
import { PrismaServiceRepository } from '@/infrastructure/database/prisma/service.prisma-repository';
import { PrismaCategoryRepository } from '@/infrastructure/database/prisma/category.prisma-repository';
import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';

function services(app: Application) {
    const router = Router();
    const serviceRepository = new PrismaServiceRepository();
    const categoryRepository = new PrismaCategoryRepository();
    const logger = new PinoLoggerProvider();
    const serviceController = new ServiceController(serviceRepository, categoryRepository, logger);

    app.use('/api/services', router);

    /**
     * @route POST /api/services
     * @desc Create a new service
     * @access Admin only
     */
    router.post(
        '/',
        authenticate,
        requirePermission('services:write'),
        (req, res) => serviceController.create(req, res)
    );

    /**
     * @route GET /api/services
     * @desc Get all services
     * @query activeOnly - Filter by active status (default: true)
     * @access Authenticated (Public for regular users, all tenants for SUPER_ADMIN)
     */
    router.get(
        '/',
        authenticate,
        (req, res) => serviceController.getAll(req, res)
    );

    /**
     * @route PUT /api/services/:id
     * @desc Update a service
     * @access Admin only
     */
    router.put(
        '/:id',
        authenticate,
        requirePermission('services:write'),
        (req, res) => serviceController.update(req, res)
    );

    /**
     * @route DELETE /api/services/:id
     * @desc Delete a service
     * @access Admin only
     */
    router.delete(
        '/:id',
        authenticate,
        requirePermission('services:write'),
        (req, res) => serviceController.delete(req, res)
    );
}

export default services;
