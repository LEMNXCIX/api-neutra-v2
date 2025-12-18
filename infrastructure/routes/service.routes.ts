import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { ServiceController } from '@/interface-adapters/controllers/service.controller';
import { PrismaServiceRepository } from '@/infrastructure/database/prisma/service.prisma-repository';
import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';

function services(app: Application) {
    const router = Router();
    const serviceRepository = new PrismaServiceRepository();
    const logger = new PinoLoggerProvider();
    const serviceController = new ServiceController(serviceRepository, logger);

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
     * @access Public
     */
    router.get(
        '/',
        (req, res) => serviceController.getAll(req, res)
    );
}

export default services;
