
import { Application, Request, Response, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { UserController } from '@/interface-adapters/controllers/user.controller';

function users(app: Application, userController: UserController) {
    const router = Router();
    app.use('/api/users', router);

    /**
     * @swagger
     * tags:
     *   name: Users
     *   description: User management
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     User:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *         name:
     *           type: string
     *         email:
     *           type: string
     *         roleId:
     *           type: string
     *         active:
     *           type: boolean
     */

    // User routes with permission-based authorization
    /**
     * @swagger
     * /users:
     *   get:
     *     summary: Get all users
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of users
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/User'
     *       403:
     *         description: Forbidden
     */
    router.get('/', authenticate, requirePermission('users:read'), userController.getAll);

    /**
     * @swagger
     * /users/find/{id}:
     *   get:
     *     summary: Get user by ID
     *     tags: [Users]
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
     *         description: User details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/User'
     *       404:
     *         description: User not found
     */
    router.get('/find/:id', authenticate, requirePermission('users:read'), userController.getById);

    /**
     * @swagger
     * /users/stats:
     *   get:
     *     summary: Get user statistics
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: User statistics
     *       403:
     *         description: Forbidden
     */
    router.get('/stats/summary', authenticate, requirePermission('stats:read'), userController.getSummaryStats);
    router.get('/stats', authenticate, requirePermission('stats:read'), userController.getUsersStats);

    // Actualizar usuario
    /**
     * @swagger
     * /users/{id}:
     *   put:
     *     summary: Update user details
     *     tags: [Users]
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
     *               email:
     *                 type: string
     *               active:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: User updated successfully
     *       403:
     *         description: Forbidden
     *       404:
     *         description: User not found
     */
    router.put("/:id", authenticate, requirePermission('users:manage'), userController.update);

    // Asignar rol a usuario
    /**
     * @swagger
     * /users/{id}/role:
     *   put:
     *     summary: Assign role to user
     *     tags: [Users]
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
     *             required:
     *               - roleId
     *             properties:
     *               roleId:
     *                 type: string
     *     responses:
     *       200:
     *         description: Role assigned successfully
     *       403:
     *         description: Forbidden
     *       404:
     *         description: User not found
     */
    router.put("/:id/role", authenticate, requirePermission('users:manage'), userController.assignRole);

    // Eliminar usuario
    /**
     * @swagger
     * /users/{id}:
     *   delete:
     *     summary: Delete a user
     *     tags: [Users]
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
     *         description: User deleted successfully
     *       403:
     *         description: Forbidden
     *       404:
     *         description: User not found
     */
    router.delete("/:id", authenticate, requirePermission('users:manage'), userController.delete);

    router.use(async (req: Request, res: Response) => {
        return res.apiError({ message: 'Pagina no encontrada. :|' }, 'Pagina no encontrada', 404);
    });
}

export default users;
