import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { ProductController } from '@/interface-adapters/controllers/product.controller';
import { PrismaProductRepository } from '@/infrastructure/database/prisma/product.prisma-repository';

function products(app: Application) {
    const router = Router();
    const productRepository = new PrismaProductRepository();
    const productController = new ProductController(productRepository);

    app.use('/api/products', router);

    /**
     * @swagger
     * tags:
     *   name: Products
     *   description: Product management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Product:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         name:
     *           type: string
     *         price:
     *           type: number
     *         description:
     *           type: string
     *         image:
     *           type: array
     *           items:
     *             type: string
     *         stock:
     *           type: number
     *         active:
     *           type: boolean
     */

    // Public routes (no authentication required)
    /**
     * @swagger
     * /products:
     *   get:
     *     summary: Get all products
     *     tags: [Products]
     *     responses:
     *       200:
     *         description: List of products
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Product'
     */
    router.get('/', productController.getAll);

    /**
     * @swagger
     * /products/search:
     *   post:
     *     summary: Search products
     *     tags: [Products]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *     responses:
     *       200:
     *         description: Search results
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Product'
     */
    router.post('/search/', productController.search);

    /**
     * @swagger
     * /products/stats:
     *   get:
     *     summary: Get product statistics
     *     tags: [Products]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Product statistics
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get('/stats', authenticate, requirePermission('stats:read'), productController.getStats);
    router.get('/stats/summary', authenticate, requirePermission('stats:read'), productController.getSummaryStats);

    /**
     * @swagger
     * /products/{id}:
     *   get:
     *     summary: Get product by ID
     *     tags: [Products]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Product details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Product'
     *       404:
     *         description: Product not found
     */
    router.get('/:id', productController.getOne);

    /**
     * @swagger
     * /products/one/{id}:
     *   get:
     *     summary: Get product by ID (Alias)
     *     tags: [Products]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Product details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Product'
     *       404:
     *         description: Product not found
     */
    router.get('/one/:id', productController.getOne); // Alias

    // Protected routes with permission-based authorization
    /**
     * @swagger
     * /products:
     *   post:
     *     summary: Create a new product
     *     tags: [Products]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ProductCreateDto'
     *     responses:
     *       201:
     *         description: Product created successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.post('/', authenticate, requirePermission('products:write'), productController.create);

    /**
     * @swagger
     * /products/{id}:
     *   put:
     *     summary: Update a product
     *     tags: [Products]
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
     *             $ref: '#/components/schemas/ProductCreateDto'
     *     responses:
     *       200:
     *         description: Product updated successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Product not found
     */
    router.put('/:id', authenticate, requirePermission('products:write'), productController.update);

    /**
     * @swagger
     * /products/{id}:
     *   delete:
     *     summary: Delete a product
     *     tags: [Products]
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
     *         description: Product deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Product not found
     */
    router.delete('/:id', authenticate, requirePermission('products:delete'), productController.delete);


}

export default products;
