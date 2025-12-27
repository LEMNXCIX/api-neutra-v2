import { Request, Response } from 'express';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IPasswordHasher, ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { IQueueProvider } from '@/core/providers/queue-provider.interface';
import { LoginUseCase } from '@/core/application/auth/login.use-case';
import { RegisterUseCase } from '@/core/application/auth/register.use-case';
import { SocialLoginUseCase } from '@/core/application/auth/social-login.use-case';
import { ForgotPasswordUseCase } from '@/core/application/auth/forgot-password.use-case';
import { ResetPasswordUseCase } from '@/core/application/auth/reset-password.use-case';
import { authResponse, providerResponse, deleteCookie } from '@/helpers/authResponse.helpers';

export class AuthController {
    private loginUseCase: LoginUseCase;
    private registerUseCase: RegisterUseCase;
    private socialLoginUseCase: SocialLoginUseCase;
    private forgotPasswordUseCase: ForgotPasswordUseCase;
    private resetPasswordUseCase: ResetPasswordUseCase;

    constructor(
        userRepository: IUserRepository,
        passwordHasher: IPasswordHasher,
        tokenGenerator: ITokenGenerator,
        logger: ILogger,
        queueProvider: IQueueProvider
    ) {
        this.loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenGenerator, logger);
        this.registerUseCase = new RegisterUseCase(userRepository, passwordHasher, tokenGenerator, logger, queueProvider);
        this.socialLoginUseCase = new SocialLoginUseCase(userRepository, tokenGenerator);
        this.forgotPasswordUseCase = new ForgotPasswordUseCase(userRepository, logger, queueProvider);
        this.resetPasswordUseCase = new ResetPasswordUseCase(userRepository, passwordHasher, logger);

        // Bind methods to instance
        this.login = this.login.bind(this);
        this.signup = this.signup.bind(this);
        this.socialLogin = this.socialLogin.bind(this);
        this.logout = this.logout.bind(this);
        this.validate = this.validate.bind(this);
        this.forgotPassword = this.forgotPassword.bind(this);
        this.resetPassword = this.resetPassword.bind(this);
    }

    async login(req: Request, res: Response) {
        // tenantId can be undefined for global login
        const tenantId = (req as any).tenantId;
        const result = await this.loginUseCase.execute(tenantId, req.body);
        return authResponse(req, res, result, 401);
    }

    async signup(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const origin = (req.headers['x-original-origin'] as string) ||
            req.headers.origin ||
            (req.headers.referer ? new URL(req.headers.referer as string).origin : null) ||
            `${req.protocol}://${req.get('host')}`;
        const result = await this.registerUseCase.execute(tenantId, req.body, origin);
        return authResponse(req, res, result, 200);
    }

    async socialLogin(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const user = (req as any).user.profile;
        const result = await this.socialLoginUseCase.execute(tenantId, user);
        return providerResponse(req, res, result, 401);
    }

    logout(req: Request, res: Response) {
        return deleteCookie(req, res);
    }

    validate(req: Request, res: Response) {
        return res.status(200).json({
            success: true,
            message: 'Validación exitosa',
            data: { user: (req as any).user }
        });
    }

    async forgotPassword(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        const origin = (req.headers['x-original-origin'] as string) ||
            req.headers.origin ||
            (req.headers.referer ? new URL(req.headers.referer as string).origin : null) ||
            `${req.protocol}://${req.get('host')}`;
        const result = await this.forgotPasswordUseCase.execute(tenantId, req.body.email, origin);
        return res.status(result.code).json(result);
    }

    async resetPassword(req: Request, res: Response) {
        const { token, newPassword } = req.body;
        const result = await this.resetPasswordUseCase.execute(token, newPassword);
        return res.status(result.code).json(result);
    }
}
