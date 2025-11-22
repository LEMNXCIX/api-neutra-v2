/// <reference path="../../types/request-dto.d.ts" />
import { Application, Router } from 'express';
import passport from 'passport';
import { AuthController } from '../../interface-adapters/controllers/auth.controller';
import authValidation from '../../middleware/auth.middleware';
import { PrismaUserRepository } from '../database/prisma/user.prisma-repository';
import { BcryptProvider } from '../providers/bcrypt.provider';
import { JwtProvider } from '../providers/jwt.provider';

function auth(app: Application) {
    const router = Router();
    app.use('/api/auth', router);

    // Dependency Injection
    const userRepository = new PrismaUserRepository();
    const passwordHasher = new BcryptProvider();
    const tokenGenerator = new JwtProvider();
    const authController = new AuthController(userRepository, passwordHasher, tokenGenerator);

    router.post('/login', authController.login);
    router.post('/signup', authController.signup);
    router.get('/logout', authController.logout);
    router.get('/validate', authValidation(1), authController.validate);

    router.get('/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
    router.get(
        '/google/callback',
        passport.authenticate('google', { session: false }),
        authController.socialLogin
    );

    router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
    router.get(
        '/facebook/callback',
        passport.authenticate('facebook', { session: false }),
        authController.socialLogin
    );

    router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
    router.get(
        '/github/callback',
        passport.authenticate('github', { session: false }),
        authController.socialLogin
    );
}

export default auth;
