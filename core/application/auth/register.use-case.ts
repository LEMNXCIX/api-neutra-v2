import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IPasswordHasher, ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { CreateUserDTO } from '@/core/entities/user.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { ValidationErrorCodes, ResourceErrorCodes } from '@/types/error-codes';
import { emailService } from '@/infrastructure/services/email.service';

export class RegisterUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenGenerator: ITokenGenerator,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, data: any) {
        if (!data.email || !data.password || !data.name) {
            this.logger.warn('Registration failed: missing fields', { data });
            return {
                success: false,
                code: 400,
                message: "Missing required fields",
                errors: [{
                    code: ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
                    message: "Email, password, and name are required",
                    field: !data.email ? 'email' : !data.password ? 'password' : 'name'
                }]
            };
        }

        try {
            const existingUser = await this.userRepository.findByEmail(tenantId, data.email);
            if (existingUser) {
                this.logger.warn('Registration failed: email already exists', { email: data.email });
                return {
                    success: false,
                    code: 409,
                    message: "Email already exists",
                    errors: [{
                        code: ResourceErrorCodes.ALREADY_EXISTS,
                        message: "A user with this email already exists",
                        field: 'email'
                    }]
                };
            }

            const hashedPassword = await this.passwordHasher.hash(data.password);

            const newUser: CreateUserDTO = {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                // roleId is optional - repository will assign default USER role
                profilePic: data.profilePic
            };

            const user = await this.userRepository.create(tenantId, newUser);

            // Fetch user with role and permissions for JWT
            const userWithRole = await this.userRepository.findById(tenantId, user.id, {
                includeRole: true,
                includePermissions: true
            });

            if (!userWithRole) {
                throw new Error('User creation failed');
            }

            const token = this.tokenGenerator.generate({
                id: userWithRole.id,
                email: userWithRole.email,
                name: userWithRole.name,
                role: userWithRole.role,  // Includes permissions
                tenantId: tenantId
            });

            const { password: _, ...safeUser } = userWithRole;

            this.logger.info('User registered successfully', { userId: userWithRole.id, email: userWithRole.email });

            // Send welcome email asynchronously (don't block registration)
            this.sendWelcomeEmail(userWithRole.email, userWithRole.name, tenantId).catch(err => {
                this.logger.error('Failed to send welcome email', { userId: userWithRole.id, error: err.message });
            });

            return {
                success: true,
                code: 201,
                message: "User created successfully",
                data: { ...safeUser, token }
            };
        } catch (error: any) {
            this.logger.error('Registration error', { email: data.email, error: error.message, stack: error.stack });
            return {
                success: false,
                code: 500,
                message: "Error creating user",
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }

    /**
     * Send welcome email to new user
     * This runs asynchronously and doesn't block registration
     */
    private async sendWelcomeEmail(email: string, name: string, tenantId: string): Promise<void> {
        try {
            await emailService.sendWelcomeEmail(email, name, {
                tenantName: 'Neutra', // TODO: Get from tenant configuration
                supportEmail: process.env.SMTP_FROM || 'support@neutra.com',
                websiteUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
                primaryColor: '#000000',
            });
            this.logger.info('Welcome email sent successfully', { email });
        } catch (error: any) {
            this.logger.error('Welcome email failed', { email, error: error.message });
            throw error;
        }
    }
}
