import { Request, Response } from "express";
import { LoginUseCase } from "@/core/application/auth/login.use-case";
import { RegisterUseCase } from "@/core/application/auth/register.use-case";
import { SocialLoginUseCase } from "@/core/application/auth/social-login.use-case";
import { ForgotPasswordUseCase } from "@/core/application/auth/forgot-password.use-case";
import { ResetPasswordUseCase } from "@/core/application/auth/reset-password.use-case";
import {
    authResponse,
    providerResponse,
    deleteCookie,
} from "@/helpers/authResponse.helpers";
import { resolveRequestOrigin } from "@/helpers/request-origin.helpers";
import { Success } from "@/core/utils/use-case-result";

export class AuthController {
    constructor(
        private loginUseCase: LoginUseCase,
        private registerUseCase: RegisterUseCase,
        private socialLoginUseCase: SocialLoginUseCase,
        private forgotPasswordUseCase: ForgotPasswordUseCase,
        private resetPasswordUseCase: ResetPasswordUseCase,
    ) {
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
        const tenantId = req.tenantId!;
        const result = await this.loginUseCase.execute(tenantId, req.body);
        return authResponse(req, res, result, 200);
    }

    async signup(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const origin = resolveRequestOrigin(req);
        const result = await this.registerUseCase.execute(
            tenantId,
            req.body,
            origin,
        );
        return authResponse(req, res, result, 200);
    }

    async socialLogin(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const profile = req.user as unknown as {
            provider: string;
            id: string;
            displayName?: string;
            emails?: Array<{ value: string }>;
            photos?: Array<{ value: string }>;
        };
        if (!profile?.provider || !profile?.id) {
            return res
                .status(401)
                .json({ success: false, message: "OAuth profile missing" });
        }
        const result = await this.socialLoginUseCase.execute(tenantId, profile);
        return providerResponse(req, res, result, 200);
    }

    logout(req: Request, res: Response) {
        return deleteCookie(req, res);
    }

    validate(req: Request, res: Response) {
        return res
            .status(200)
            .json(Success({ user: req.user! }, "Validación exitosa"));
    }

    async forgotPassword(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const origin = resolveRequestOrigin(req);
        const result = await this.forgotPasswordUseCase.execute(
            tenantId,
            req.body.email,
            origin,
        );
        return res.status(200).json(result);
    }

    async resetPassword(req: Request, res: Response) {
        const { token, newPassword } = req.body;
        const result = await this.resetPasswordUseCase.execute(
            token,
            newPassword,
        );
        return res.status(200).json(result);
    }
}
