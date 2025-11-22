import { Application, Request, Response, Router } from 'express';
import authMiddleware from '../../middleware/auth.middleware';
import { CartController } from '../../interface-adapters/controllers/cart.controller';
import { PrismaCartRepository } from '../database/prisma/cart.prisma-repository';

function cart(app: Application) {
    const router = Router();
    const cartRepository = new PrismaCartRepository();
    const cartController = new CartController(cartRepository);

    app.use('/api/cart', router);

    //Obtener los productos del carrito
    router.get('/', authMiddleware(1), cartController.getItems);

    //Añadir producto al carrito
    router.post('/add', authMiddleware(1), cartController.addToCart);

    //Eliminar un producto del carrito
    router.put('/remove', authMiddleware(1), cartController.removeFromCart);

    //Limpiar el carrito
    router.delete('/clear', authMiddleware(1), cartController.clearCart);

    router.get('/stats', authMiddleware(2), cartController.getCartsStats);

    router.use(async (req: Request, res: Response) => {
        return res.apiError({ message: 'Pagina no encontrada. :|' }, 'Pagina no encontrada', 404);
    });
}

export default cart;
