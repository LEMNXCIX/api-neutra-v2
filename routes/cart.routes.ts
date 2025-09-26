import { Application, Request, Response } from 'express';
const CartService = require('../services/cart.services');
const authMiddleware = require('../middleware/auth.middleware');

function cart(app: Application) {
  const router = require('express').Router();
  const cartServ = new CartService();

  app.use('/api/cart', router);

  //Obtener los productos del carrito
  router.get('/', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await cartServ.getItems((req as any).user.id);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  //Añadir producto al carrito
  router.post('/add', authMiddleware(1), async (req: Request, res: Response) => {
    const { idProduct, amount } = (req as any).body;
    const result = await cartServ.addToCart((req as any).user.id, idProduct, amount);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, result.message || 'OK', 200);
  });

  //Eliminar un producto del carrito
  router.put('/remove', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await cartServ.removeFromCart((req as any).body.cartId, (req as any).body.id);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, result.message || 'OK', 200);
  });

  //Limpiar el carrito
  router.delete('/clear', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await cartServ.clearCart((req as any).user.id);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.use(async (req: Request, res: Response) => {
    return res.apiError({ message: 'Pagina no encontrada. :|' }, 'Pagina no encontrada', 400);
  });
}

export = cart;
