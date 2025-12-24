/// <reference path="../../types/request-dto.d.ts" />
import { Application, Router } from 'express';
import passport from 'passport';
import { AuthController } from '@/interface-adapters/controllers/auth.controller';
import { authenticate } from '@/middleware/authenticate.middleware';
import { PrismaUserRepository } from '@/infrastructure/database/prisma/user.prisma-repository';
import { BcryptProvider } from '@/infrastructure/providers/bcrypt.provider';
import { JwtProvider } from '@/infrastructure/providers/jwt.provider';
import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';
import { BullMQQueueProvider } from '@/infrastructure/providers/bullmq-queue.provider';

function auth(app: Application) {
    const router = Router();
    app.use('/api/auth', router);

    // Dependency Injection
    const userRepository = new PrismaUserRepository();
    const passwordHasher = new BcryptProvider();
    const tokenGenerator = new JwtProvider();
    const logger = new PinoLoggerProvider();
    const queueProvider = new BullMQQueueProvider();
    const authController = new AuthController(userRepository, passwordHasher, tokenGenerator, logger, queueProvider);

    /**
     * @swagger
     * tags:
     *   name: Auth
     *   description: Authentication endpoints
     */

    /**
     * @swagger
     * /auth/login:
     *   post:
     *     summary: Login user
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginDto'
     *     responses:
     *       200:
     *         description: Login successful
     *       401:
     *         description: Invalid credentials
     */
    router.post('/login', authController.login);

    /**
     * @swagger
     * /auth/signup:
     *   post:
     *     summary: Register a new user
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateUserDto'
     *     responses:
     *       201:
     *         description: User created successfully
     *       400:
     *         description: Bad request
     */
    router.post('/signup', authController.signup);

    /**
     * @swagger
     * /auth/logout:
     *   get:
     *     summary: Logout user
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Logout successful
     *   post:
     *     summary: Logout user
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Logout successful
     */
    router.get('/logout', authController.logout);
    router.post('/logout', authController.logout);

    /**
     * @swagger
     * /auth/validate:
     *   get:
     *     summary: Validate current session
     *     tags: [Auth]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Session is valid
     *       401:
     *         description: Unauthorized
     */
    router.get('/validate', authenticate, authController.validate);

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
