import { Application, Request, Response, Router } from 'express';
import authValidation from '../middleware/auth.middleware';
import UserService from '../services/users.services';

function users(app: Application) {
  const userServ = new UserService();
  const router = Router();
  app.use('/api/users', router);

  router.get('/', authValidation(2), async (req: Request, res: Response) => {
    const result = await userServ.getAll();
    return res.json(result);
  });

  router.get('/find/:id', authValidation(2), async (req: Request, res: Response) => {
    const result = await userServ.getById((req.params as any).id);
    return res.json(result);
  });

  router.get('/stats', authValidation(2), async (req: Request, res: Response) => {
    const result = await userServ.getUsersStats();
    return res.json(result);
  });

  router.use(async (req: Request, res: Response) => {
    return res.apiError({ message: 'Pagina no encontrada. :|' }, 'Pagina no encontrada', 404);
  });
}

export default users;
