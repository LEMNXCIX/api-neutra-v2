import { Application, Request, Response } from 'express';
const ProductsServices = require('../services/products.services');
const authMiddleware = require('../middleware/auth.middleware');

function products(app: Application) {
  const router = require('express').Router();
  const productsServ = new ProductsServices();

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

  app.use('/api/products', router);

  router.get('/', async (req: Request, res: Response) => {
    const result = await productsServ.getAll();
    return sendResult(res, result, '', 200);
  });

  router.post('/', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await productsServ.create({
      ...(req as any).body,
      owner: (req as any).user.id,
    });
    return sendResult(res, result, '', 200);
  });

  router.post('/search/', async (req: Request, res: Response) => {
    const name = (req as any).body.name;
    const result = await productsServ.getByName(name);
    return sendResult(res, result, '', 200);
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const id = (req.params as any).id;
    const result = await productsServ.getOne(id);
    return sendResult(res, result, '', 200);
  });

  router.get('/one/:id', async (req: Request, res: Response) => {
    const id = (req.params as any).id;
    const result = await productsServ.getOne(id);
    return sendResult(res, result, '', 200);
  });

  router.delete('/:id', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await productsServ.delete((req.params as any).id, (req as any).user.id);
    return sendResult(res, result, '', 200);
  });

  router.put('/:id', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await productsServ.update((req.params as any).id, (req as any).body);
    return sendResult(res, result, '', 200);
  });
}

export = products;
