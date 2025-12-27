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

    async execute(tenantId: string | undefined, data: any) {
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
            // findByEmail signature changed: (email, options)
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

            // Debug: Log user tenants to see structure
            this.logger.info('User tenants loaded', {
                email,
                tenantCount: user.tenants?.length || 0,
                tenants: user.tenants?.map(ut => ({
                    tenantId: ut.tenantId,
                    roleName: ut.role?.name,
                    tenantSlug: ut.tenant?.slug
                }))
            });

            // Resolve role for the requested tenant
            let userTenant = user.tenants?.find(ut => ut.tenantId === tenantId || ut.tenant?.slug === tenantId);

            // Check if user has SUPER_ADMIN role in the 'superadmin' tenant
            const globalSuperAdmin = user.tenants?.find(ut =>
                ut.tenant?.slug === 'superadmin' && ut.role?.name === 'SUPER_ADMIN'
            );

            // If user is SUPER_ADMIN in superadmin tenant and doesn't have a role in this tenant,
            // allow access with SUPER_ADMIN privileges
            if (!userTenant && globalSuperAdmin) {
                this.logger.info('Global SUPER_ADMIN accessing tenant', { email, tenantId });
                userTenant = globalSuperAdmin;
            }

            if (!userTenant || !userTenant.role) {
                this.logger.warn('Login attempt failed: user has no role in this tenant', { email, tenantId });
                return {
                    success: false,
                    code: 403,
                    message: "User is not authorized for this tenant",
                    errors: [{
                        code: AuthErrorCodes.FORBIDDEN,
                        message: "User has no role in this tenant"
                    }]
                };
            }

            // Extract permissions
            const permissions = userTenant.role.permissions.map((p: any) => p.name);

            // Save permissions to Redis (TTL: 1 hour) for this specific user:tenant context
            await this.redis.set(`user:permissions:${user.id}:${tenantId}`, JSON.stringify(permissions), 3600);

            // Generate token with lighter payload
            const token = this.tokenGenerator.generate({
                id: user.id,
                email: user.email,
                name: user.name,
                role: {
                    id: userTenant.role.id,
                    name: userTenant.role.name,
                    level: userTenant.role.level
                },
                tenantId: userTenant.tenantId
            });

            // Sanitize user for response
            const { password: _, ...safeUser } = user;

            this.logger.info('Login successful', { userId: user.id, email: user.email });

            return {
                success: true,
                code: 200,
                message: "Login successful",
                data: {
                    ...safeUser,
                    token,
                    // Include current tenant's role at top level for frontend compatibility
                    role: userTenant.role,
                    roleId: userTenant.roleId
                }
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

