import { Application, Request, Response } from 'express';
const CartService = require('../services/cart.services');
const authMiddleware = require('../middleware/auth.middleware');

function cart(app: Application) {
  const router = require('express').Router();
  const cartServ = new CartService();

  function sendResult(res: Response, result: any, okMsg = '', okCode = 200) {
    const isServiceResult = result && typeof result === 'object' && (
      'success' in result || 'code' in result || 'data' in result || 'error' in result
    );
    if (isServiceResult) {
      if (result && (result.error || result.success === false)) {
        return res.apiError(result.errors || result.message || result, result.message || 'Error', result.code || 400);
      }
      return res.apiSuccess(result.data !== undefined ? result.data : result, result.message || okMsg || 'OK', result.code || okCode);
    }
    return res.apiSuccess(result, okMsg || 'OK', okCode);
  }

  app.use('/api/cart', router);

  //Obtener los productos del carrito
  router.get('/', authMiddleware(1), async (req: Request, res: Response) => {
    const userObj = (req as any).user;
    const userId = userObj && (userObj.id || userObj._id) ? String(userObj.id || userObj._id) : null;
    if (!userId) {
      return res.apiError('No se encontró id de usuario en el token', 'No autorizado', 403);
    }

    const result = await cartServ.getItems(userId);
    return sendResult(res, result, '', 200);
  });

  //Añadir producto al carrito
  router.post('/add', authMiddleware(1), async (req: Request, res: Response) => {
    const { idProduct, amount } = (req as any).body;
    const result = await cartServ.addToCart((req as any).user.id, idProduct, amount);
    return sendResult(res, result, result.message || 'OK', 200);
  });

  //Eliminar un producto del carrito
  router.put('/remove', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await cartServ.removeFromCart((req as any).body.cartId, (req as any).body.id);
    return sendResult(res, result, result.message || 'OK', 200);
  });

  //Limpiar el carrito
  router.delete('/clear', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await cartServ.clearCart((req as any).user.id);
    return sendResult(res, result, '', 200);
  });

  router.use(async (req: Request, res: Response) => {
    return res.apiError({ message: 'Pagina no encontrada. :|' }, 'Pagina no encontrada', 400);
  });
}

export = cart;
