import { Application, Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.middleware';
import CartService from '../services/cart.services';

function cart(app: Application) {
  const router = Router();
  const cartServ = new CartService();

  app.use('/api/cart', router);

  //Obtener los productos del carrito
  router.get('/', authMiddleware(1), async (req: Request, res: Response) => {
    const userObj = (req as any).user;
    const userId = userObj && (userObj.id || userObj._id) ? String(userObj.id || userObj._id) : null;
    if (!userId) {
      return res.apiError('No se encontró id de usuario en el token', 'No autorizado', 403);
    }

    const result = await cartServ.getItems(userId);
    return res.json(result);
  });

  //Añadir producto al carrito
  router.post('/add', authMiddleware(1), async (req: Request, res: Response) => {
    const { idProduct, amount } = (req as any).body;
    const result = await cartServ.addToCart((req as any).user.id, idProduct, amount);
    return res.json(result);
  });

  //Eliminar un producto del carrito
  router.put('/remove', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await cartServ.removeFromCart((req as any).body.cartId, (req as any).body.id);
    return res.json(result);
  });

  //Limpiar el carrito
  router.delete('/clear', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await cartServ.clearCart((req as any).user.id);
    return res.json(result);
  });

  router.get('/stats', authMiddleware(2), async (req: Request, res: Response) => {
    const result = await cartServ.getCartsStats();
    return res.json(result);
  });

  router.use(async (req: Request, res: Response) => {
    return res.apiError({ message: 'Pagina no encontrada. :|' }, 'Pagina no encontrada', 404);
  });
}

export default cart;
