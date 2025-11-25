import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IPasswordHasher, ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { AuthErrorCodes, ValidationErrorCodes } from '@/types/error-codes';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';

export class LoginUseCase {
    private redis: RedisProvider;

    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenGenerator: ITokenGenerator,
        private logger: ILogger
    ) {
        this.redis = RedisProvider.getInstance();
    }

    async execute(data: any) {
        const { email, password } = data;

        if (!email || !password) {
            this.logger.warn('Login attempt failed: missing credentials', { email });
            return {
                success: false,
                code: 400,
                message: "Email and password are required",
                errors: [{
                    code: ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
                    message: "Email and password are required",
                    field: !email ? 'email' : 'password'
                }]
            };
        }

        try {
            // Fetch user with role and permissions
            const user = await this.userRepository.findByEmail(email, {
                includeRole: true,
                includePermissions: true
            });

            if (!user || !user.password) {
                this.logger.warn('Login attempt failed: user not found or no password', { email });
                return {
                    success: false,
                    code: 401,
                    message: "Invalid credentials",
                    errors: [{
                        code: AuthErrorCodes.INVALID_CREDENTIALS,
                        message: "Invalid credentials"
                    }]
                };
            }

            const isValid = await this.passwordHasher.compare(password, user.password);

            if (!isValid) {
                this.logger.warn('Login attempt failed: invalid password', { email });
                return {
                    success: false,
                    code: 401,
                    message: "Invalid credentials",
                    errors: [{
                        code: AuthErrorCodes.INVALID_CREDENTIALS,
                        message: "Invalid credentials"
                    }]
                };
            }

            if (!user.role) {
                this.logger.warn('Login attempt failed: user has no role', { email });
                return {
                    success: false,
                    code: 403,
                    message: "User has no role assigned",
                    errors: [{
                        code: AuthErrorCodes.FORBIDDEN,
                        message: "User has no role assigned"
                    }]
                };
            }

            // Extract permissions
            const permissions = user.role.permissions.map(p => p.name);

            // Save permissions to Redis (TTL: 1 hour)
            await this.redis.set(`user:permissions:${user.id}`, JSON.stringify(permissions), 3600);

            // Generate token with lighter payload (no permissions)
            const token = this.tokenGenerator.generate({
                id: user.id,
                email: user.email,
                name: user.name,
                role: {
                    id: user.role.id,
                    name: user.role.name,
                    level: user.role.level
                }
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
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}

