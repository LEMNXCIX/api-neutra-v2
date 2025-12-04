import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { CouponController } from '@/interface-adapters/controllers/coupon.controller';
import { PrismaCouponRepository } from '@/infrastructure/database/prisma/coupon.prisma-repository';

function couponRoutes(app: Application) {
    const router = Router();
    const couponRepository = new PrismaCouponRepository();
    const couponController = new CouponController(couponRepository);

    app.use('/api/coupons', router);

    /**
     * @swagger
     * tags:
     *   name: Coupons
     *   description: Coupon management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Coupon:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         code:
     *           type: string
     *         type:
     *           type: string
     *           enum: [PERCENT, FIXED]
     *         value:
     *           type: number
     *         active:
     *           type: boolean
     *         expiresAt:
     *           type: string
     *           format: date-time
     */

    // Authenticated user routes
    /**
     * @swagger
     * /coupons/validate:
     *   post:
     *     summary: Validate a coupon code
     *     tags: [Coupons]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - code
     *             properties:
     *               code:
     *                 type: string
     *     responses:
     *       200:
     *         description: Coupon is valid
     *       400:
     *         description: Invalid coupon
     *       401:
     *         description: Unauthorized
     */
    router.post('/validate', authenticate, couponController.validate);

    // Admin routes
    /**
     * @swagger
     * /coupons/stats:
     *   get:
     *     summary: Get coupon statistics (Admin)
     *     tags: [Coupons]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Coupon statistics
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get('/stats', authenticate, requirePermission('stats:read'), couponController.getStats);

    /**
     * @swagger
     * /coupons:
     *   get:
     *     summary: Get all coupons (Admin)
     *     tags: [Coupons]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of coupons
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Coupon'
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get('/', authenticate, requirePermission('coupons:read'), couponController.getAll);

    /**
     * @swagger
     * /coupons/{id}:
     *   get:
     *     summary: Get coupon by ID
     *     tags: [Coupons]
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
     *         description: Coupon details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Coupon'
     *       404:
     *         description: Coupon not found
     */
    router.get('/:id', authenticate, requirePermission('coupons:read'), couponController.getById);

    /**
     * @swagger
     * /coupons/code/{code}:
     *   get:
     *     summary: Get coupon by code
     *     tags: [Coupons]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: code
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Coupon details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Coupon'
     *       404:
     *         description: Coupon not found
     */
    router.get('/code/:code', authenticate, requirePermission('coupons:read'), couponController.getByCode);

    /**
     * @swagger
     * /coupons:
     *   post:
     *     summary: Create a new coupon
     *     tags: [Coupons]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - code
     *               - type
     *               - value
     *               - expiresAt
     *             properties:
     *               code:
     *                 type: string
     *               type:
     *                 type: string
     *                 enum: [PERCENT, FIXED]
     *               value:
     *                 type: number
     *               expiresAt:
     *                 type: string
     *                 format: date-time
     *               description:
     *                 type: string
     *               minPurchaseAmount:
     *                 type: number
     *               maxDiscountAmount:
     *                 type: number
     *               usageLimit:
     *                 type: number
     *     responses:
     *       201:
     *         description: Coupon created successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.post('/', authenticate, requirePermission('coupons:write'), couponController.create);

    /**
     * @swagger
     * /coupons/{id}:
     *   put:
     *     summary: Update a coupon
     *     tags: [Coupons]
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
     *               code:
     *                 type: string
     *               value:
     *                 type: number
     *               active:
     *                 type: boolean
     *               expiresAt:
     *                 type: string
     *                 format: date-time
     *     responses:
     *       200:
     *         description: Coupon updated successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Coupon not found
     */
    router.put('/:id', authenticate, requirePermission('coupons:write'), couponController.update);

    /**
     * @swagger
     * /coupons/{id}:
     *   delete:
     *     summary: Delete a coupon
     *     tags: [Coupons]
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
     *         description: Coupon deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Coupon not found
     */
    router.delete('/:id', authenticate, requirePermission('coupons:delete'), couponController.delete);
}

export default couponRoutes;
