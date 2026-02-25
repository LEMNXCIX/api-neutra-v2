import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { RoleController } from '@/interface-adapters/controllers/role.controller';

function roleRoutes(app: Application, roleController: RoleController) {
    const router = Router();
    app.use('/api/roles', router);

    /**
     * @swagger
     * tags:
     *   name: Roles
     *   description: Role management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Role:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         name:
     *           type: string
     *         description:
     *           type: string
     *         level:
     *           type: number
     *         active:
     *           type: boolean
     */

    // Protected routes (Admin only usually)
    /**
     * @swagger
     * /roles:
     *   get:
     *     summary: Get all roles
     *     tags: [Roles]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of roles
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Role'
     *       403:
     *         description: Forbidden
     */
    router.get('/', authenticate, requirePermission('roles:read'), roleController.getAll);

    /**
     * @swagger
     * /roles/{id}:
     *   get:
     *     summary: Get role by ID
     *     tags: [Roles]
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
     *         description: Role details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Role'
     *       404:
     *         description: Role not found
     */
    router.get('/:id', authenticate, requirePermission('roles:read'), roleController.getById);

    /**
     * @swagger
     * /roles:
     *   post:
     *     summary: Create a new role
     *     tags: [Roles]
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
     *               level:
     *                 type: number
     *     responses:
     *       201:
     *         description: Role created successfully
     *       403:
     *         description: Forbidden
     */
    router.post('/', authenticate, requirePermission('roles:write'), roleController.create);

    /**
     * @swagger
     * /roles/{id}:
     *   put:
     *     summary: Update a role
     *     tags: [Roles]
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
     *               level:
     *                 type: number
     *               active:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Role updated successfully
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Role not found
     */
    router.put('/:id', authenticate, requirePermission('roles:write'), roleController.update);

    /**
     * @swagger
     * /roles/{id}:
     *   delete:
     *     summary: Delete a role
     *     tags: [Roles]
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
     *         description: Role deleted successfully
     *       403:
     *         description: Forbidden
     *       404:
     *         description: Role not found
     */
    router.delete('/:id', authenticate, requirePermission('roles:delete'), roleController.delete);
}

export default roleRoutes;
