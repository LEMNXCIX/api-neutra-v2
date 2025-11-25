import { Application, Router } from 'express';
import authMiddleware from '@/middleware/auth.middleware';
import { OrderController } from '@/interface-adapters/controllers/order.controller';
import { PrismaOrderRepository } from '@/infrastructure/database/prisma/order.prisma-repository';
import { PrismaCartRepository } from '@/infrastructure/database/prisma/cart.prisma-repository';

function order(app: Application) {
    const router = Router();
    const orderRepository = new PrismaOrderRepository();
    const cartRepository = new PrismaCartRepository();
    const orderController = new OrderController(orderRepository, cartRepository);

    app.use('/api/order', router);

    router.post('/', authMiddleware(1), orderController.create);
    router.get('/', authMiddleware(1), orderController.getAll);
    router.get('/all', authMiddleware(1), orderController.getAll); // Alias
    router.get('/getOrder', authMiddleware(1), orderController.getOne);
    router.get('/getOrderByUser', authMiddleware(1), orderController.getByUser);
    router.put('/changeStatus', authMiddleware(2), orderController.changeStatus);
}

export default order;
