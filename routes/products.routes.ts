import { Application, Request, Response } from 'express';
const ProductsServices = require('../services/products.services');
const authMiddleware = require('../middleware/auth.middleware');

function products(app: Application) {
  const router = require('express').Router();
  const productsServ = new ProductsServices();

  app.use('/api/products', router);

  router.get('/', async (req: Request, res: Response) => {
    const result = await productsServ.getAll();
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.post('/', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await productsServ.create({
      ...(req as any).body,
      owner: (req as any).user.id,
    });
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.post('/search/', async (req: Request, res: Response) => {
    const name = (req as any).body.name;
    const result = await productsServ.getByName(name);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const id = (req.params as any).id;
    const result = await productsServ.getOne(id);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.get('/one/:id', async (req: Request, res: Response) => {
    const id = (req.params as any).id;
    const result = await productsServ.getOne(id);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 400);
    return res.apiSuccess(result, '', 200);
  });

  router.delete('/:id', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await productsServ.delete((req.params as any).id, (req as any).user.id);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 403);
    return res.apiSuccess(result, '', 200);
  });

  router.put('/:id', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await productsServ.update((req.params as any).id, (req as any).body);
    if (result && result.error) return res.apiError(result.message || result, 'Error', 403);
    return res.apiSuccess(result, '', 200);
  });
}

export = products;
