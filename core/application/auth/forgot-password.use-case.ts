import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { IQueueProvider } from "@/core/providers/queue-provider.interface";
import { IConfigProvider } from "@/core/providers/config-provider.interface";
import { ICryptoProvider } from "@/core/providers/crypto-provider.interface";
import { AUTH_CONSTANTS } from "@/core/domain/constants";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";

export class ForgotPasswordUseCase {
    constructor(
        private userRepository: IUserRepository,
        private queueProvider: IQueueProvider,
        private configProvider: IConfigProvider,
        private cryptoProvider: ICryptoProvider,
    ) {}

    async execute(
        tenantId: string | undefined,
        email: string,
        origin?: string,
    ): Promise<UseCaseResult> {
        if (!email) {
            throw new BusinessRuleViolationError("Email is required");
        }

        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            return Success(
                null,
                "If an account with that email exists, we have sent a password reset link.",
            );
        }

        const resetToken = this.cryptoProvider.randomBytes(
            AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_BYTES,
        );
        const resetExpires = new Date(
            Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_EXPIRATION_MS,
        );

        await this.userRepository.update(user.id, {
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
        });

        const baseUrl = origin || this.configProvider.getFrontendUrl();
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

        await this.queueProvider.enqueue("notifications", {
            type: "PASSWORD_RESET",
            email: user.email,
            resetLink,
            tenantId: tenantId || user.tenants?.[0]?.tenantId,
            origin: origin,
        });

        return Success(
            null,
            "If an account with that email exists, we have sent a password reset link.",
        );
    }
}
