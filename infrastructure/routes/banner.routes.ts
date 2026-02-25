import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { BannerController } from '@/interface-adapters/controllers/banner.controller';

function bannerRoutes(app: Application, bannerController: BannerController) {
    const router = Router();
    app.use('/api/banners', router);

    /**
     * @swagger
     * tags:
     *   name: Banners
     *   description: Banner management endpoints
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Banner:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         title:
     *           type: string
     *         imageUrl:
     *           type: string
     *         active:
     *           type: boolean
     *         priority:
     *           type: number
     *     BannerStats:
     *       type: object
     *       properties:
     *         impressions:
     *           type: number
     *         clicks:
     *           type: number
     */

    /**
     * @swagger
     * /banners:
     *   get:
     *     summary: Get active banners
     *     tags: [Banners]
     *     responses:
     *       200:
     *         description: List of active banners
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Banner'
     */
    router.get('/', bannerController.getActive);

    /**
     * @swagger
     * /banners/all/list:
     *   get:
     *     summary: Get all banners (Admin)
     *     tags: [Banners]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of all banners
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Banner'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get('/all/list', authenticate, requirePermission('banners:read'), bannerController.getAll);

    /**
     * @swagger
     * /banners/stats:
     *   get:
     *     summary: Get banner statistics (Admin)
     *     tags: [Banners]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Banner statistics
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get('/stats', authenticate, requirePermission('stats:read'), bannerController.getStats);

    /**
     * @swagger
     * /banners/{id}:
     *   get:
     *     summary: Get banner by ID
     *     tags: [Banners]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Banner details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Banner'
     *       404:
     *         description: Banner not found
     */
    router.get('/:id', bannerController.getById);

    /**
     * @swagger
     * /banners/{id}/impression:
     *   post:
     *     summary: Track banner impression
     *     tags: [Banners]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Impression tracked successfully
     */
    router.post('/:id/impression', bannerController.trackImpression);

    /**
     * @swagger
     * /banners/{id}/click:
     *   post:
     *     summary: Track banner click
     *     tags: [Banners]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Click tracked successfully
     */
    router.post('/:id/click', bannerController.trackClick);

    /**
     * @swagger
     * /banners:
     *   post:
     *     summary: Create a new banner
     *     tags: [Banners]
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
     *               - imageUrl
     *             properties:
     *               title:
     *                 type: string
     *               imageUrl:
     *                 type: string
     *               description:
     *                 type: string
     *               priority:
     *                 type: number
     *               active:
     *                 type: boolean
     *     responses:
     *       201:
     *         description: Banner created successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.post('/', authenticate, requirePermission('banners:write'), bannerController.create);

    /**
     * @swagger
     * /banners/{id}:
     *   put:
     *     summary: Update a banner
     *     tags: [Banners]
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
     *               imageUrl:
     *                 type: string
     *               description:
     *                 type: string
     *               priority:
     *                 type: number
     *               active:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Banner updated successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Banner not found
     */
    router.put('/:id', authenticate, requirePermission('banners:write'), bannerController.update);

    /**
     * @swagger
     * /banners/{id}:
     *   delete:
     *     summary: Delete a banner
     *     tags: [Banners]
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
     *         description: Banner deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Banner not found
     */
    router.delete('/:id', authenticate, requirePermission('banners:delete'), bannerController.delete);
}

export default bannerRoutes;
