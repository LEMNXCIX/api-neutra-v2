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
    return res.status(result.error ? 400 : 200).json(result);
  });

  //Añadir producto al carrito
  router.post('/add', authMiddleware(1), async (req: Request, res: Response) => {
    const { idProduct, amount } = (req as any).body;
    const result = await cartServ.addToCart((req as any).user.id, idProduct, amount);
    return res.status(result.error ? 400 : 200).json(result);
  });

  //Eliminar un producto del carrito
  router.put('/remove', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await cartServ.removeFromCart((req as any).body.cartId, (req as any).body.id);
    return res.status(result.error ? 400 : 200).json(result);
  });

  //Limpiar el carrito
  router.delete('/clear', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await cartServ.clearCart((req as any).user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.use(async (req: Request, res: Response) => {
    return res.status(400).json({
      success: false,
      error: true,
      message: 'Pagina no encontrada. :|',
      data: {},
      errorDetails: null,
    });
  });
}

export = cart;
