import { Application, Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.middleware';
import ProductsServices from '../services/products.services';

function products(app: Application) {
  const router = Router();
  const productsServ = new ProductsServices();

  app.use('/api/products', router);

  router.get('/', async (req: Request, res: Response) => {
    const result = await productsServ.getAll();
    return res.json(result);
  });

  router.post('/', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await productsServ.create({
      ...(req as any).body,
      owner: (req as any).user.id,
    });
    return res.json(result);
  });

  router.post('/search/', async (req: Request, res: Response) => {
    const name = (req as any).body.name;
    const result = await productsServ.getByName(name);
    return res.json(result);
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const id = (req.params as any).id;
    const result = await productsServ.getOne(id);
    return res.json(result);
  });

  router.get('/one/:id', async (req: Request, res: Response) => {
    const id = (req.params as any).id;
    const result = await productsServ.getOne(id);
    return res.json(result);
  });

  router.delete('/:id', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await productsServ.delete((req.params as any).id, (req as any).user.id);
    return res.json(result);
  });

  router.put('/:id', authMiddleware(1), async (req: Request, res: Response) => {
    const result = await productsServ.update((req.params as any).id, (req as any).body);
    return res.json(result);
  });

  router.get('/stats', authMiddleware(2), async (req: Request, res: Response) => {
    const result = await productsServ.getProductsStats();
    return res.json(result);
  });
}

export default products;
