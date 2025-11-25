import { Application, Request, Response, Router } from 'express';
import { authenticate } from '@/middleware/authenticate.middleware';
import { requirePermission } from '@/middleware/authorization.middleware';
import { CartController } from '@/interface-adapters/controllers/cart.controller';
import { PrismaCartRepository } from '@/infrastructure/database/prisma/cart.prisma-repository';

function cart(app: Application) {
    const router = Router();
    const cartRepository = new PrismaCartRepository();
    const cartController = new CartController(cartRepository);

    app.use('/api/cart', router);

    //Obtener los productos del carrito
    router.get('/', authenticate, requirePermission('cart:read'), cartController.getItems);

    //Crear carrito explícitamente
    router.post('/', authenticate, requirePermission('cart:write'), cartController.create);

    //Añadir producto al carrito
    router.post('/add', authenticate, requirePermission('cart:write'), cartController.addToCart);

    //Eliminar un producto del carrito
    router.put('/remove', authenticate, requirePermission('cart:write'), cartController.removeFromCart);

    //Limpiar el carrito
    router.delete('/clear', authenticate, requirePermission('cart:write'), cartController.clearCart);

    router.get('/stats', authenticate, requirePermission('stats:read'), cartController.getCartsStats);

    router.use(async (req: Request, res: Response) => {
        return res.apiError({ message: 'Pagina no encontrada. :|' }, 'Pagina no encontrada', 404);
    });
}

export default cart;
