import type { Request, Response } from "express";
import type { ForgotPasswordUseCase } from "@/core/application/auth/forgot-password.use-case";
import type { JoinTenantUseCase } from "@/core/application/auth/join-tenant.use-case";
import type { LoginUseCase } from "@/core/application/auth/login.use-case";
import type { RegisterUseCase } from "@/core/application/auth/register.use-case";
import type { ResetPasswordUseCase } from "@/core/application/auth/reset-password.use-case";
import type { SocialLoginUseCase } from "@/core/application/auth/social-login.use-case";
import type {
    ForgotPasswordDTO,
    LoginDTO,
    ResetPasswordDTO,
} from "@/core/application/dtos/requests/auth.request";
import type { CreateUserDTO } from "@/core/application/dtos/requests/user.request";
import { Success } from "@/core/utils/use-case-result";
import {
    authResponse,
    deleteCookie,
    providerResponse,
} from "@/helpers/authResponse.helpers";
import { resolveRequestOrigin } from "@/helpers/request-origin.helpers";

export class AuthController {
    constructor(
        private loginUseCase: LoginUseCase,
        private registerUseCase: RegisterUseCase,
        private socialLoginUseCase: SocialLoginUseCase,
        private forgotPasswordUseCase: ForgotPasswordUseCase,
        private resetPasswordUseCase: ResetPasswordUseCase,
        private joinTenantUseCase: JoinTenantUseCase,
    ) {
        // Bind methods to instance
        this.login = this.login.bind(this);
        this.signup = this.signup.bind(this);
        this.socialLogin = this.socialLogin.bind(this);
        this.logout = this.logout.bind(this);
        this.validate = this.validate.bind(this);
        this.forgotPassword = this.forgotPassword.bind(this);
        this.resetPassword = this.resetPassword.bind(this);
        this.joinTenant = this.joinTenant.bind(this);
    }

    /**
     * Registers the signed-in identity in the tenant named by the request's
     * tenant header. The token identifies who is joining, so the password they
     * registered elsewhere is not asked for again.
     */
    async joinTenant(req: Request, res: Response) {
        const result = await this.joinTenantUseCase.execute(
            req.tenantId,
            req.user!.id,
        );
        return authResponse(req, res, result, 200);
    }

    async login(req: Request, res: Response) {
        // tenantId can be undefined for global login
        const tenantId = req.tenantId!;
        // No `?? req.body` fallback: the route always validates, and a fallback
        // would silently read an unvalidated body whenever that ever stopped
        // being true. The convention suite forbids the pattern for this reason.
        const body = req.validatedBody as LoginDTO;
        const result = await this.loginUseCase.execute(tenantId, body);
        return authResponse(req, res, result, 200);
    }

    async signup(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const origin = resolveRequestOrigin(req);
        const result = await this.registerUseCase.execute(
            tenantId,
            req.validatedBody as CreateUserDTO,
            origin,
        );
        return authResponse(req, res, result, 200);
    }

    async socialLogin(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        // SAFETY: the OAuth strategy populates `req.user` with the provider
        // profile, but `Express.User` is typed as the authenticated JWT user, so
        // the two shapes cannot both be expressed. The runtime guard below is
        // the real check: it rejects a profile missing `provider` or `id`.
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
        const body = req.validatedBody as ForgotPasswordDTO;
        const result = await this.forgotPasswordUseCase.execute(
            tenantId,
            body.email,
            origin,
        );
        return res.status(200).json(result);
    }

    async resetPassword(req: Request, res: Response) {
        const { token, newPassword } = req.validatedBody as ResetPasswordDTO;
        const result = await this.resetPasswordUseCase.execute(
            token,
            newPassword,
        );
        return res.status(200).json(result);
    }
}
