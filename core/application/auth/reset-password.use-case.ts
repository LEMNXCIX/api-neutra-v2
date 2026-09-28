import {
    BusinessRuleViolationError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import type { IPasswordHasher } from "@/core/providers/auth-providers.interface";
import type { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class ResetPasswordUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
    ) {}

    async execute(token: string, newPassword: string): Promise<UseCaseResult> {
        if (!token || !newPassword) {
            throw new ValidationError("Token and new password are required");
        }

        const user = await this.userRepository.findByResetToken(token);

        if (!user) {
            throw new BusinessRuleViolationError(
                "Password reset token is invalid or has expired",
            );
        }

        const hashedPassword = await this.passwordHasher.hash(newPassword);

        await this.userRepository.update(user.id, {
            password: hashedPassword,
            resetPasswordToken: undefined,
            resetPasswordExpires: undefined,
        });

        return Success(null, "Password has been successfully reset");
    }
}
