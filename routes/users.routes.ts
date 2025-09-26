import { Application, Request, Response } from 'express';
const authValidation = require('../middleware/auth.middleware');
const UserService = require('../services/users.services');

function users(app: Application) {
  const userServ = new UserService();
  const router = require('express').Router();
  app.use('/api/users', router);

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

  router.get('/', authValidation(2), async (req: Request, res: Response) => {
    const result = await userServ.getAll();
    return sendResult(res, result, '', 200);
  });

  router.get('/find/:id', authValidation(2), async (req: Request, res: Response) => {
    const result = await userServ.getById((req.params as any).id);
    return sendResult(res, result, '', 200);
  });

  router.get('/stats', authValidation(2), async (req: Request, res: Response) => {
    const result = await userServ.getUsersStats((req.params as any).id);
    // result is a ServiceResult / ApiPayload
    if (!result || result.success === false) {
      return res.apiError(result && result.errors ? result.errors : result.message || 'Error', result.message || 'Error', result.code || 400);
    }
    return res.apiSuccess(result.data, result.message || '', result.code || 200);
  });
}

export = users;
