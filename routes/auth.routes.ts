/// <reference path="../types/request-dto.d.ts" />
import { Application, Request, Response, Router } from 'express';
import passport from 'passport';
import { authResponse, providerResponse, deleteCookie } from '../helpers/authResponse.helpers';
import AuthService from '../services/auth.services';
import authValidation from '../middleware/auth.middleware';

function auth(app: Application) {
  const router = Router();
  app.use('/api/auth', router);

  const authServ = new AuthService();

  router.post('/login', async (req: Request, res: Response) => {
    const body = (req as any).body;
    const result = await authServ.login(body);
    return authResponse(res, result, 401);
  });

  router.post('/signup', async (req: Request, res: Response) => {
    const body = (req as any).body;
    const result = await authServ.signup(body);
    return authResponse(res, result, 200);
  });

  router.get('/logout', (req: Request, res: Response) => {
    return deleteCookie(res);
  });

  router.get('/validate', authValidation(1), (req: Request, res: Response) => {
    return res.apiSuccess({ user: (req as any).user }, 'Validación exitosa', 200);
  });

  router.get('/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false }),
    async (req: Request, res: Response) => {
      const user = (req as any).user.profile;
      const result = await authServ.socialLogin(user);
      return providerResponse(res, result, 401);
    }
  );

  router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
  router.get(
    '/facebook/callback',
    passport.authenticate('facebook', { session: false }),
    async (req: Request, res: Response) => {
      const user = (req as any).user.profile;
      const result = await authServ.socialLogin(user);
      return providerResponse(res, result, 401);
    }
  );

  router.get('/twitter', passport.authenticate('twitter'));
  router.get(
    '/twitter/callback',
    passport.authenticate('twitter', { scope: ['email'] }),
    async (req: Request, res: Response) => {
      const user = (req as any).user.profile;
      const result = await authServ.socialLogin(user);
      return providerResponse(res, result, 401);
    }
  );

  router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
  router.get(
    '/github/callback',
    passport.authenticate('github', { session: false }),
    async (req: Request, res: Response) => {
      const user = (req as any).user.profile;
      const result = await authServ.socialLogin(user);
      return providerResponse(res, result, 401);
    }
  );
}

export default auth;
