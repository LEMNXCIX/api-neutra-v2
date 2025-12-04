import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { SlideController } from '@/interface-adapters/controllers/slide.controller';
import { PrismaSlideRepository } from '@/infrastructure/database/prisma/slide.prisma-repository';

function slide(app: Application) {
    const router = Router();
    const slideRepository = new PrismaSlideRepository();
    const slideController = new SlideController(slideRepository);

    app.use('/api/slide', router);

    /**
     * @swagger
     * tags:
     *   name: Slides
     *   description: Slideshow management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Slide:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         title:
     *           type: string
     *         img:
     *           type: string
     *         desc:
     *           type: string
     *         active:
     *           type: boolean
     */

    /**
     * @swagger
     * /slide:
     *   post:
     *     summary: Create a new slide
     *     tags: [Slides]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - title
     *               - img
     *             properties:
     *               title:
     *                 type: string
     *               img:
     *                 type: string
     *               desc:
     *                 type: string
     *     responses:
     *       201:
     *         description: Slide created successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.post('/', authenticate, requirePermission('slides:write'), slideController.create);

    /**
     * @swagger
     * /slide/{id}:
     *   put:
     *     summary: Update a slide
     *     tags: [Slides]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               img:
     *                 type: string
     *               desc:
     *                 type: string
     *               active:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Slide updated successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Slide not found
     */
    router.put('/:id', authenticate, requirePermission('slides:write'), slideController.update);

    /**
     * @swagger
     * /slide:
     *   get:
     *     summary: Get all slides
     *     tags: [Slides]
     *     responses:
     *       200:
     *         description: List of slides
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Slide'
     */
    router.get('/', slideController.getAll);

    /**
     * @swagger
     * /slide/stats:
     *   get:
     *     summary: Get slide statistics (Admin)
     *     tags: [Slides]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Slide statistics
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get('/stats', authenticate, requirePermission('stats:read'), slideController.getStats);

    /**
     * @swagger
     * /slide/{id}:
     *   get:
     *     summary: Get slide by ID
     *     tags: [Slides]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Slide details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Slide'
     *       404:
     *         description: Slide not found
     */
    router.get('/:id', slideController.getById);

    /**
     * @swagger
     * /slide/{id}:
     *   delete:
     *     summary: Delete a slide
     *     tags: [Slides]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Slide deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Slide not found
     */
    router.delete('/:id', authenticate, requirePermission('slides:delete'), slideController.delete);
}

export default slide;
