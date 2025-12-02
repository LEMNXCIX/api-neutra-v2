import { Application, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { OrderController } from '@/interface-adapters/controllers/order.controller';
import { PrismaOrderRepository } from '@/infrastructure/database/prisma/order.prisma-repository';
import { PrismaCartRepository } from '@/infrastructure/database/prisma/cart.prisma-repository';

function order(app: Application) {
    const router = Router();
    const orderRepository = new PrismaOrderRepository();
    const cartRepository = new PrismaCartRepository();
    const orderController = new OrderController(orderRepository, cartRepository);

    app.use('/api/order', router);

    // User routes
    router.post('/', authenticate, orderController.create);
    router.get('/getOrder', authenticate, orderController.getOne);
    router.get('/getOrderByUser', authenticate, orderController.getByUser);

    // Admin routes
    router.get('/', authenticate, requirePermission('orders:read'), orderController.getAll);
    router.get('/all', authenticate, requirePermission('orders:read'), orderController.getAll); // Alias
    router.put('/changeStatus', authenticate, requirePermission('orders:write'), orderController.changeStatus);
}

export default order;
