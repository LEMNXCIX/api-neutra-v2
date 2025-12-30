import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { OrderController } from '@/interface-adapters/controllers/order.controller';
import { PrismaOrderRepository } from '@/infrastructure/database/prisma/order.prisma-repository';
import { PrismaCartRepository } from '@/infrastructure/database/prisma/cart.prisma-repository';
import { PrismaProductRepository } from '@/infrastructure/database/prisma/product.prisma-repository';
import { PrismaCouponRepository } from '@/infrastructure/database/prisma/coupon.prisma-repository';
import { PrismaUserRepository } from '@/infrastructure/database/prisma/user.prisma-repository';
import { PrismaFeatureRepository } from '@/infrastructure/database/prisma/feature.prisma-repository';
import { emailService } from '@/infrastructure/services/email.service';

import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';

function order(app: Application) {
    const router = Router();
    const orderRepository = new PrismaOrderRepository();
    const cartRepository = new PrismaCartRepository();
    const productRepository = new PrismaProductRepository();
    const couponRepository = new PrismaCouponRepository();
    const userRepository = new PrismaUserRepository();
    const logger = new PinoLoggerProvider();
    const featureRepository = new PrismaFeatureRepository();
    const orderController = new OrderController(
        orderRepository,
        cartRepository,
        productRepository,
        couponRepository,
        userRepository,
        emailService,
        featureRepository,
        logger
    );

    app.use('/api/order', router);

    /**
     * @swagger
     * tags:
     *   name: Orders
     *   description: Order management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     OrderItem:
     *       type: object
     *       properties:
     *         productId:
     *           type: string
     *         amount:
     *           type: number
     *         price:
     *           type: number
     *     Order:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         userId:
     *           type: string
     *         status:
     *           type: string
     *         total:
     *           type: number
     *         items:
     *           type: array
     *           items:
     *             $ref: '#/components/schemas/OrderItem'
     */
    router.get('/statuses', authenticate, orderController.getStatuses);

    /**
     * @swagger
     * /order:
     *   post:
     *     summary: Create a new order
     *     tags: [Orders]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateOrderDto'
     *     responses:
     *       201:
     *         description: Order created successfully
     *       401:
     *         description: Unauthorized
     */
    router.post('/', authenticate, orderController.create);

    /**
     * @swagger
     * /order/getOrder:
     *   get:
     *     summary: Get specific order
     *     tags: [Orders]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - orderId
     *             properties:
     *               orderId:
     *                 type: string
     *     responses:
     *       200:
     *         description: Order details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Order'
     *       404:
     *         description: Order not found
     */
    router.get('/getOrder', authenticate, orderController.getOne);



    /**
     * @swagger
     * /order/getOrderByUser:
     *   get:
     *     summary: Get current user's orders
     *     tags: [Orders]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [PENDIENTE, PAGADO, ENVIADO, ENTREGADO]
     *         description: Filter orders by status (optional)
     *     responses:
     *       200:
     *         description: List of user orders
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Order'
     */
    router.get('/getOrderByUser', authenticate, orderController.getByUser);

    // Admin routes
    /**
     * @swagger
     * /order:
     *   get:
     *     summary: Get all orders (Admin)
     *     tags: [Orders]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of all orders
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Order'
     *       403:
     *         description: Forbidden
     */
    router.get('/stats', authenticate, requirePermission('stats:read'), orderController.getStats);
    router.get('/', authenticate, requirePermission('orders:read'), orderController.getAll);

    /**
     * @swagger
     * /order/all:
     *   get:
     *     summary: Get all orders (Alias)
     *     tags: [Orders]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of all orders
     *       403:
     *         description: Forbidden
     */
    router.get('/all', authenticate, requirePermission('orders:read'), orderController.getAll); // Alias

    /**
     * @swagger
     * /order/changeStatus:
     *   put:
     *     summary: Change order status
     *     tags: [Orders]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - idOrder
     *               - status
     *             properties:
     *               idOrder:
     *                 type: string
     *               status:
     *                 type: string
     *     responses:
     *       200:
     *         description: Order status updated
     *       403:
     *         description: Forbidden
     */
    router.put('/changeStatus', authenticate, requirePermission('orders:write'), orderController.changeStatus);

    /**
     * @swagger
     * /order/{id}:
     *   put:
     *     summary: Update order details
     *     tags: [Orders]
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
     *               trackingNumber:
     *                 type: string
     *               status:
     *                 type: string
     *     responses:
     *       200:
     *         description: Order updated successfully
     *       403:
     *         description: Forbidden
     */
    router.put('/:id', authenticate, requirePermission('orders:write'), orderController.update);

    /**
     * @swagger
     * /order/{id}:
     *   get:
     *     summary: Get order by ID
     *     tags: [Orders]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Order ID
     *     responses:
     *       200:
     *         description: Order details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Order'
     *       404:
     *         description: Order not found
     */
    router.get('/:id', authenticate, orderController.getOneById);
}

export default order;
