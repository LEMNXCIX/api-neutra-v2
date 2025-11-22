import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IPasswordHasher, ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class LoginUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenGenerator: ITokenGenerator,
        private logger: ILogger
    ) { }

    async execute(data: any) {
        const { email, password } = data;

        if (!email || !password) {
            this.logger.warn('Login attempt failed: missing credentials', { email });
            return {
                success: false,
                code: 400,
                message: "Email and password are required",
                errors: ["Email and password are required"]
            };
        }

        try {
            const user = await this.userRepository.findByEmail(email);

            if (!user || !user.password) {
                this.logger.warn('Login attempt failed: user not found or no password', { email });
                return {
                    success: false,
                    code: 401,
                    message: "Invalid credentials",
                    errors: ["Invalid credentials"]
                };
            }

            const isValid = await this.passwordHasher.compare(password, user.password);

            if (!isValid) {
                this.logger.warn('Login attempt failed: invalid password', { email });
                return {
                    success: false,
                    code: 401,
                    message: "Invalid credentials",
                    errors: ["Invalid credentials"]
                };
            }

            const token = this.tokenGenerator.generate({
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            });

            // Sanitize user for response
            const { password: _, ...safeUser } = user;

            this.logger.info('Login successful', { userId: user.id, email: user.email });

            return {
                success: true,
                code: 200,
                message: "Login successful",
                data: { ...safeUser, token }
            };
        } catch (error: any) {
            this.logger.error('Login error', { email, error: error.message, stack: error.stack });
            return {
                success: false,
                code: 500,
                message: "Internal server error during login",
                errors: [error.message]
            };
        }
    }
}
