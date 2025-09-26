import { Application, Request, Response } from 'express';
const OrderService = require('../services/order.services');
const authMiddleware = require('../middleware/auth.middleware');

function order(app: Application) {
  const router = require('express').Router();
  const orderServ = new OrderService();

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

  app.use('/api/order', router);

  router.post('/', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.create((req as any).user.id);
    return sendResult(res, result, result.message || 'OK', 200);
  });

  router.get('/', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.getAll((req as any).user.id);
    return sendResult(res, result, '', 200);
  });

  router.get('/all', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.getAll((req as any).user.id);
    return sendResult(res, result, '', 200);
  });

  router.get('/getOrder', authMiddleware(1), async (req: Request, res: Response) => {
    const { orderId } = (req as any).body;
    const result = await orderServ.getOrderById(orderId);
    return sendResult(res, result, '', 200);
  });

  router.get('/getOrderByUser', authMiddleware(1), async (req: Request, res: Response) => {
    const { userId } = (req as any).body;
    const result = await orderServ.getOrderByUser(userId);
    return sendResult(res, result, '', 200);
  });

  router.put('/changeStatus', authMiddleware(2), async (req: Request, res: Response) => {
    const { idOrder, status } = (req as any).body;
    const result = await orderServ.changeStatus(idOrder, status);
    return sendResult(res, result, '', 200);
  });

  router.delete('/clear', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.clearCart((req as any).user.id);
    return sendResult(res, result, '', 200);
  });
}

export = order;
