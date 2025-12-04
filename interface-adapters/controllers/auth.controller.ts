import { Request, Response } from 'express';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IPasswordHasher, ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { LoginUseCase } from '@/core/application/auth/login.use-case';
import { RegisterUseCase } from '@/core/application/auth/register.use-case';
import { SocialLoginUseCase } from '@/core/application/auth/social-login.use-case';
import { authResponse, providerResponse, deleteCookie } from '@/helpers/authResponse.helpers';

export class AuthController {
    private loginUseCase: LoginUseCase;
    private registerUseCase: RegisterUseCase;
    private socialLoginUseCase: SocialLoginUseCase;

    constructor(
        userRepository: IUserRepository,
        passwordHasher: IPasswordHasher,
        tokenGenerator: ITokenGenerator,
        logger: ILogger
    ) {
        this.loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenGenerator, logger);
        this.registerUseCase = new RegisterUseCase(userRepository, passwordHasher, tokenGenerator, logger);
        this.socialLoginUseCase = new SocialLoginUseCase(userRepository, tokenGenerator);

        // Bind methods to instance
        this.login = this.login.bind(this);
        this.signup = this.signup.bind(this);
        this.socialLogin = this.socialLogin.bind(this);
        this.logout = this.logout.bind(this);
        this.validate = this.validate.bind(this);
    }

    async login(req: Request, res: Response) {
        const result = await this.loginUseCase.execute(req.body);
        return authResponse(res, result, 401);
    }

    async signup(req: Request, res: Response) {
        const result = await this.registerUseCase.execute(req.body);
        return authResponse(res, result, 200);
    }

    async socialLogin(req: Request, res: Response) {
        const user = (req as any).user.profile;
        const result = await this.socialLoginUseCase.execute(user);
        return providerResponse(res, result, 401);
    }

    logout(req: Request, res: Response) {
        return deleteCookie(res);
    }

    validate(req: Request, res: Response) {
        return res.status(200).json({
            success: true,
            message: 'Validación exitosa',
            data: { user: (req as any).user }
        });
    }
}
