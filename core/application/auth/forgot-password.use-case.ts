import crypto from 'crypto';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { IQueueProvider } from '@/core/providers/queue-provider.interface';
import { AUTH_CONSTANTS } from '@/core/domain/constants';

export class ForgotPasswordUseCase {
    constructor(
        private userRepository: IUserRepository,
        private logger: ILogger,
        private queueProvider: IQueueProvider
    ) { }

    async execute(tenantId: string | undefined, email: string, origin?: string) {
        if (!email) {
            return {
                success: false,
                code: 400,
                message: "Email is required"
            };
        }

        try {
            // Find user globally
            const user = await this.userRepository.findByEmail(email);

            if (!user) {
                // For security, don't reveal if user exists or not
                this.logger.warn('Forgot password requested for non-existent email', { email, tenantId });
                return {
                    success: true,
                    code: 200,
                    message: "If an account with that email exists, we have sent a password reset link."
                };
            }

            // Generate token
            const resetToken = crypto.randomBytes(AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_BYTES).toString('hex');
            const resetExpires = new Date(Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_EXPIRATION_MS);

            // Update user with reset info
            await this.userRepository.update(user.id, {
                resetPasswordToken: resetToken,
                resetPasswordExpires: resetExpires
            });

            // Enqueue password reset email
            // Use origin if available, otherwise fallback to env
            const baseUrl = origin || process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

            await this.queueProvider.enqueue('notifications', {
                type: 'PASSWORD_RESET',
                email: user.email,
                resetLink,
                tenantId: tenantId || user.tenants?.[0]?.tenantId,
                origin: origin
            });

            this.logger.info('Password reset token generated and enqueued', { userId: user.id, email: user.email });

            return {
                success: true,
                code: 200,
                message: "If an account with that email exists, we have sent a password reset link."
            };
        } catch (error: any) {
            this.logger.error('Forgot password error', { email, error: error.message });
            return {
                success: false,
                code: 500,
                message: "Error processing forgot password request"
            };
        }
    }
}
