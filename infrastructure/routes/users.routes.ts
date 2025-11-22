import { Application, Request, Response, Router } from 'express';
import authValidation from '@/middleware/auth.middleware';
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

    router.get('/', authValidation(2), userController.getAll);
    router.get('/find/:id', authValidation(2), userController.getById);
    router.get('/stats', authValidation(2), userController.getUsersStats);

    router.use(async (req: Request, res: Response) => {
        return res.apiError({ message: 'Pagina no encontrada. :|' }, 'Pagina no encontrada', 404);
    });
}

export default users;
