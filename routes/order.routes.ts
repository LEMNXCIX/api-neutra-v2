import { Application, Request, Response } from 'express';
const OrderService = require('../services/order.services');
const authMiddleware = require('../middleware/auth.middleware');

function order(app: Application) {
  const router = require('express').Router();
  const orderServ = new OrderService();

  app.use('/api/order', router);

  router.post('/', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.create((req as any).user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.get('/', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.getAll((req as any).user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.get('/all', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.getAll((req as any).user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.get('/getOrder', authMiddleware(1), async (req: Request, res: Response) => {
    const { orderId } = (req as any).body;
    const result = await orderServ.getOrderById(orderId);
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.get('/getOrderByUser', authMiddleware(1), async (req: Request, res: Response) => {
    const { userId } = (req as any).body;
    const result = await orderServ.getOrderByUser(userId);
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.put('/changeStatus', authMiddleware(2), async (req: Request, res: Response) => {
    const { idOrder, status } = (req as any).body;
    const result = await orderServ.changeStatus(idOrder, status);
    return res.status(result.error ? 400 : 200).json(result);
  });

  router.delete('/clear', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await orderServ.clearCart((req as any).user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });
}

export = order;
