import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { IPasswordHasher } from "@/core/providers/auth-providers.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    ValidationError,
    BusinessRuleViolationError,
} from "@/core/domain/errors/domain-errors";

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
