/// <reference path="../../types/request-dto.ts" />
import { Application, Router } from "express";
import passport from "passport";
import { AuthController } from "@/interface-adapters/controllers/auth.controller";
import { authenticate } from "@/middleware/authenticate.middleware";

function auth(app: Application, authController: AuthController) {
    const router = Router();
    app.use("/api/auth", router);

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
    router.post("/login", authController.login);

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
    router.post("/signup", authController.signup);

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
    router.get("/logout", authController.logout);
    router.post("/logout", authController.logout);

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
    router.get("/validate", authenticate, authController.validate);

    /**
     * @swagger
     * /auth/forgot-password:
     *   post:
     *     summary: Request password reset
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ForgotPasswordDto'
     *     responses:
     *       200:
     *         description: Reset email sent if account exists
     *       400:
     *         description: Invalid email
     */
    router.post("/forgot-password", authController.forgotPassword);

    /**
     * @swagger
     * /auth/reset-password:
     *   post:
     *     summary: Reset password with token
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ResetPasswordDto'
     *     responses:
     *       200:
     *         description: Password reset successfully
     *       400:
     *         description: Invalid or expired token
     */
    router.post("/reset-password", authController.resetPassword);

    /**
     * @swagger
     * /auth/google:
     *   get:
     *     summary: Initiate Google OAuth login
     *     tags: [Auth]
     *     responses:
     *       302:
     *         description: Redirect to Google login
     */
    router.get(
        "/google",
        passport.authenticate("google", { scope: ["email", "profile"] }),
    );
    /**
     * @swagger
     * /auth/google/callback:
     *   get:
     *     summary: Google OAuth callback
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Google login successful
     *       401:
     *         description: Google authentication failed
     */
    router.get(
        "/google/callback",
        passport.authenticate("google", { session: false }),
        authController.socialLogin,
    );

    /**
     * @swagger
     * /auth/facebook:
     *   get:
     *     summary: Initiate Facebook OAuth login
     *     tags: [Auth]
     *     responses:
     *       302:
     *         description: Redirect to Facebook login
     */
    router.get(
        "/facebook",
        passport.authenticate("facebook", { scope: ["email"] }),
    );

    /**
     * @swagger
     * /auth/facebook/callback:
     *   get:
     *     summary: Facebook OAuth callback
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Facebook login successful
     *       401:
     *         description: Facebook authentication failed
     */
    router.get(
        "/facebook/callback",
        passport.authenticate("facebook", { session: false }),
        authController.socialLogin,
    );

    /**
     * @swagger
     * /auth/github:
     *   get:
     *     summary: Initiate GitHub OAuth login
     *     tags: [Auth]
     *     responses:
     *       302:
     *         description: Redirect to GitHub login
     */
    router.get(
        "/github",
        passport.authenticate("github", { scope: ["user:email"] }),
    );

    /**
     * @swagger
     * /auth/github/callback:
     *   get:
     *     summary: GitHub OAuth callback
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: GitHub login successful
     *       401:
     *         description: GitHub authentication failed
     */
    router.get(
        "/github/callback",
        passport.authenticate("github", { session: false }),
        authController.socialLogin,
    );
}

export default auth;
