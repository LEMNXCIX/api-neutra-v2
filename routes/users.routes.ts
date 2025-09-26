import { Application, Request, Response } from 'express';
const authValidation = require('../middleware/auth.middleware');
const UserService = require('../services/users.services');

function users(app: Application) {
  const userServ = new UserService();
  const router = require('express').Router();
  app.use('/api/users', router);

  router.get('/', authValidation(2), async (req: Request, res: Response) => {
    const users = await userServ.getAll();
    return res.status(users.error ? 400 : 200).json(users);
  });

  router.get('/find/:id', authValidation(2), async (req: Request, res: Response) => {
    const users = await userServ.getById((req.params as any).id);
    return res.status(users.error ? 400 : 200).json(users);
  });

  router.get('/stats', authValidation(2), async (req: Request, res: Response) => {
    const users = await userServ.getUsersStats((req.params as any).id);
    console.log(users);
    return res.status(users.error ? 400 : 200).json(users);
  });
}

export = users;
