import { Application, Request, Response, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { CartController } from '@/interface-adapters/controllers/cart.controller';

function cart(app: Application, cartController: CartController) {
    const router = Router();
    app.use('/api/cart', router);

    /**
     * @swagger
     * tags:
     *   name: Cart
     *   description: Shopping cart management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     CartItem:
     *       type: object
     *       properties:
     *         productId:
     *           type: string
     *         quantity:
     *           type: number
     *         price:
     *           type: number
     *     Cart:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         userId:
     *           type: string
     *         items:
     *           type: array
     *           items:
     *             $ref: '#/components/schemas/CartItem'
     */

    /**
     * @swagger
     * /cart:
     *   get:
     *     summary: Get current user's cart items
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Cart items retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/CartItem'
     *       401:
     *         description: Unauthorized
     */
    router.get('/', authenticate, requirePermission('cart:read'), cartController.getItems);

    /**
     * @swagger
     * /cart:
     *   post:
     *     summary: Create a new cart explicitly
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       201:
     *         description: Cart created successfully
     *       401:
     *         description: Unauthorized
     */
    router.post('/', authenticate, requirePermission('cart:write'), cartController.create);

    /**
     * @swagger
     * /cart/add:
     *   post:
     *     summary: Add item to cart
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AddToCartDto'
     *     responses:
     *       200:
     *         description: Item added to cart successfully
     *       401:
     *         description: Unauthorized
     *       400:
     *         description: Invalid input
     */
    router.post('/add', authenticate, requirePermission('cart:write'), cartController.addToCart);

    /**
     * @swagger
     * /cart/remove:
     *   put:
     *     summary: Remove item from cart
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - productId
     *             properties:
     *               productId:
     *                 type: string
     *     responses:
     *       200:
     *         description: Item removed from cart successfully
     *       401:
     *         description: Unauthorized
     */
    router.put('/remove', authenticate, requirePermission('cart:write'), cartController.removeFromCart);

    /**
     * @swagger
     * /cart/clear:
     *   delete:
     *     summary: Clear all items from cart
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Cart cleared successfully
     *       401:
     *         description: Unauthorized
     */
    router.delete('/clear', authenticate, requirePermission('cart:write'), cartController.clearCart);

    /**
     * @swagger
     * /cart/stats:
     *   get:
     *     summary: Get cart statistics (Admin)
     *     tags: [Cart]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Cart statistics retrieved successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get('/stats', authenticate, requirePermission('stats:read'), cartController.getCartsStats);

    router.use(async (req: Request, res: Response) => {
        return res.apiError({ message: 'Pagina no encontrada. :|' }, 'Pagina no encontrada', 404);
    });
}

export default cart;
