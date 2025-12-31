import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IPasswordHasher } from '@/core/providers/auth-providers.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class ResetPasswordUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private logger: ILogger
    ) { }

    async execute(token: string, newPassword: string) {
        if (!token || !newPassword) {
            return {
                success: false,
                code: 400,
                message: "Token and new password are required"
            };
        }

        try {
            // Find user by valid reset token
            const user = await this.userRepository.findByResetToken(token);

            if (!user) {
                this.logger.warn('Reset password attempts with invalid or expired token', { token });
                return {
                    success: false,
                    code: 400,
                    message: "Password reset token is invalid or has expired"
                };
            }

            // Hash new password
            const hashedPassword = await this.passwordHasher.hash(newPassword);

            // Update user password and clear reset info
            await this.userRepository.update(user.id, {
                password: hashedPassword,
                resetPasswordToken: undefined,
                resetPasswordExpires: undefined
            });

            this.logger.info('Password reset successful', { userId: user.id, email: user.email });

            return {
                success: true,
                code: 200,
                message: "Password has been successfully reset"
            };
        } catch (error: any) {
            this.logger.error('Reset password error', { error: error.message });
            return {
                success: false,
                code: 500,
                message: "Error processing password reset"
            };
        }
    }
}
