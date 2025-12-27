import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { FeatureController } from '@/interface-adapters/controllers/feature.controller';
import { PrismaFeatureRepository } from '@/infrastructure/database/prisma/feature.prisma-repository';
import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';

function featureRoutes(app: Application) {
    const router = Router();
    const featureRepository = new PrismaFeatureRepository();
    const logger = new PinoLoggerProvider();
    const featureController = new FeatureController(featureRepository, logger);

    app.use('/api/features', router);

    /**
     * @swagger
     * tags:
     *   name: Features
     *   description: Available system features management
     */

    /**
     * @swagger
     * /features:
     *   get:
     *     summary: Get all available features
     *     tags: [Features]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of features
     */
    router.get('/', authenticate, requirePermission('features:read'), featureController.getAll);

    /**
     * @swagger
     * /features:
     *   post:
     *     summary: Create a new feature
     *     tags: [Features]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       201:
     *         description: Feature created
     */
    router.post('/', authenticate, requirePermission('features:write'), featureController.create);

    /**
     * @swagger
     * /features/{id}:
     *   put:
     *     summary: Update a feature
     *     tags: [Features]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Feature updated
     */
    router.put('/:id', authenticate, requirePermission('features:write'), featureController.update);

    /**
     * @swagger
     * /features/{id}:
     *   delete:
     *     summary: Delete a feature
     *     tags: [Features]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Feature deleted
     */
    router.delete('/:id', authenticate, requirePermission('features:delete'), featureController.delete);
}

export default featureRoutes;
