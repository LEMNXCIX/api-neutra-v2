import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { PermissionController } from '@/interface-adapters/controllers/permission.controller';

function permissionRoutes(app: Application, permissionController: PermissionController) {
    const router = Router();
    app.use('/api/permissions', router);

    /**
     * @swagger
     * tags:
     *   name: Permissions
     *   description: Permission management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Permission:
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

    // Protected routes (Admin only usually)
    /**
     * @swagger
     * /permissions:
     *   get:
     *     summary: Get all permissions
     *     tags: [Permissions]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of permissions
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Permission'
     *       403:
     *         description: Forbidden
     */
    router.get('/', authenticate, requirePermission('permissions:read'), permissionController.getAll);

    /**
     * @swagger
     * /permissions/{id}:
     *   get:
     *     summary: Get permission by ID
     *     tags: [Permissions]
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
     *         description: Permission details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Permission'
     *       404:
     *         description: Permission not found
     */
    router.get('/:id', authenticate, requirePermission('permissions:read'), permissionController.getById);

    /**
     * @swagger
     * /permissions:
     *   post:
     *     summary: Create a new permission
     *     tags: [Permissions]
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
     *         description: Permission created successfully
     *       403:
     *         description: Forbidden
     */
    router.post('/', authenticate, requirePermission('permissions:write'), permissionController.create);

    /**
     * @swagger
     * /permissions/{id}:
     *   put:
     *     summary: Update a permission
     *     tags: [Permissions]
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
     *         description: Permission updated successfully
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Permission not found
     */
    router.put('/:id', authenticate, requirePermission('permissions:write'), permissionController.update);

    /**
     * @swagger
     * /permissions/{id}:
     *   delete:
     *     summary: Delete a permission
     *     tags: [Permissions]
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
     *         description: Permission deleted successfully
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Permission not found
     */
    router.delete('/:id', authenticate, requirePermission('permissions:delete'), permissionController.delete);
}

export default permissionRoutes;
