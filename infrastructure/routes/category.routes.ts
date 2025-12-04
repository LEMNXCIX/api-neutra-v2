import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { CategoryController } from '@/interface-adapters/controllers/category.controller';
import { PrismaCategoryRepository } from '@/infrastructure/database/prisma/category.prisma-repository';

function categoryRoutes(app: Application) {
    const router = Router();
    const categoryRepository = new PrismaCategoryRepository();
    const categoryController = new CategoryController(categoryRepository);

    app.use('/api/categories', router);

    /**
     * @swagger
     * tags:
     *   name: Categories
     *   description: Product category management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Category:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         name:
     *           type: string
     *         description:
     *           type: string
     *         active:
     *           type: boolean
     */

    /**
     * @swagger
     * /categories:
     *   get:
     *     summary: Get all categories
     *     tags: [Categories]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *         description: Page number for pagination (optional)
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         description: Number of items per page (optional)
     *     responses:
     *       200:
     *         description: List of categories
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Category'
     */
    router.get('/', categoryController.getAll);

    /**
     * @swagger
     * /categories/stats:
     *   get:
     *     summary: Get category statistics (Admin)
     *     tags: [Categories]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Category statistics
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.get('/stats', authenticate, requirePermission('stats:read'), categoryController.getStats);

    /**
     * @swagger
     * /categories/{id}:
     *   get:
     *     summary: Get category by ID
     *     tags: [Categories]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Category details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Category'
     *       404:
     *         description: Category not found
     */
    router.get('/:id', categoryController.getById);

    // Protected routes
    /**
     * @swagger
     * /categories:
     *   post:
     *     summary: Create a new category
     *     tags: [Categories]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *             properties:
     *               name:
     *                 type: string
     *               description:
     *                 type: string
     *     responses:
     *       201:
     *         description: Category created successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     */
    router.post('/', authenticate, requirePermission('categories:write'), categoryController.create);

    /**
     * @swagger
     * /categories/{id}:
     *   put:
     *     summary: Update a category
     *     tags: [Categories]
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
     *               name:
     *                 type: string
     *               description:
     *                 type: string
     *               active:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Category updated successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Category not found
     */
    router.put('/:id', authenticate, requirePermission('categories:write'), categoryController.update);

    /**
     * @swagger
     * /categories/{id}:
     *   delete:
     *     summary: Delete a category
     *     tags: [Categories]
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
     *         description: Category deleted successfully
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Category not found
     */
    router.delete('/:id', authenticate, requirePermission('categories:delete'), categoryController.delete);
}

export default categoryRoutes;
