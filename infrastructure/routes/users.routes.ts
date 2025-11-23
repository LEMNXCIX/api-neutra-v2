import { Application, Request, Response, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { UserController } from '@/interface-adapters/controllers/user.controller';
import { PrismaUserRepository } from '@/infrastructure/database/prisma/user.prisma-repository';
import { PrismaCartRepository } from '@/infrastructure/database/prisma/cart.prisma-repository';

function users(app: Application) {
    const router = Router();
    app.use('/api/users', router);

    // Dependency Injection
    const userRepository = new PrismaUserRepository();
    const cartRepository = new PrismaCartRepository();
    const userController = new UserController(userRepository, cartRepository);

    // User routes with permission-based authorization
    router.get('/', authenticate, requirePermission('users:read'), userController.getAll);
    router.get('/find/:id', authenticate, requirePermission('users:read'), userController.getById);
    router.get('/stats', authenticate, requirePermission('stats:read'), userController.getUsersStats);

    router.use(async (req: Request, res: Response) => {
        return res.apiError({ message: 'Pagina no encontrada. :|' }, 'Pagina no encontrada', 404);
    });
}

export default users;
