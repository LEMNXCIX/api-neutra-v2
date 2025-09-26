import { Application, Request, Response } from 'express';
const OrderService = require('../services/order.services');
const authMiddleware = require('../middleware/auth.middleware');

function order(app: Application) {
  const router = require('express').Router();
  const orderServ = new OrderService();

  app.use('/api/order', router);

  router.post('/', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.create((req as any).user.id);
    if (result && (result.error || result.succes === false)) {
      return res.apiError(result.message || result, result.message || 'Error', 400);
    }
    return res.apiSuccess(result, result.message || 'OK', 200);
  });

  router.get('/', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.getAll((req as any).user.id);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.get('/all', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.getAll((req as any).user.id);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.get('/getOrder', authMiddleware(1), async (req: Request, res: Response) => {
    const { orderId } = (req as any).body;
    const result = await orderServ.getOrderById(orderId);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.get('/getOrderByUser', authMiddleware(1), async (req: Request, res: Response) => {
    const { userId } = (req as any).body;
    const result = await orderServ.getOrderByUser(userId);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.put('/changeStatus', authMiddleware(2), async (req: Request, res: Response) => {
    const { idOrder, status } = (req as any).body;
    const result = await orderServ.changeStatus(idOrder, status);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.delete('/clear', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.clearCart((req as any).user.id);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });
}

export = order;
