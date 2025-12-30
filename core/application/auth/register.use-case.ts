import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IPasswordHasher, ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { CreateUserDTO } from '@/core/entities/user.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { IQueueProvider } from '@/core/providers/queue-provider.interface';
import { ValidationErrorCodes, ResourceErrorCodes } from '@/types/error-codes';
import { prisma } from '@/config/db.config';

export class RegisterUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenGenerator: ITokenGenerator,
        private logger: ILogger,
        private queueProvider: IQueueProvider
    ) { }

    async execute(tenantId: string | undefined, data: any, origin?: string) {
        // Default to superadmin tenant if none provided
        let resolvedTenantId = tenantId;
        if (!resolvedTenantId) {
            const superadminTenant = await prisma.tenant.findFirst({
                where: { slug: 'superadmin' }
            });
            resolvedTenantId = superadminTenant?.id;
        }

        if (!resolvedTenantId) {
            this.logger.error('No tenant context provided and superadmin not found');
            throw new Error('Tenant context required');
        }

        const currentTenantId = resolvedTenantId;

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
            // findByEmail signature changed: (email, options)
            let user = await this.userRepository.findByEmail(data.email);

            if (user) {
                // Check if user already belongs to this tenant
                const alreadyInTenant = user.tenants?.some(ut => ut.tenantId === currentTenantId || ut.tenant?.slug === currentTenantId);
                if (alreadyInTenant) {
                    this.logger.warn('Registration failed: user already in tenant', { email: data.email, currentTenantId });
                    return {
                        success: false,
                        code: 409,
                        message: "Email already exists in this tenant",
                        errors: [{
                            code: ResourceErrorCodes.ALREADY_EXISTS,
                            message: "You are already registered in this site. Please login.",
                            field: 'email'
                        }]
                    };
                }
                // If user exists globally but not in this tenant, we might want to add them or tell them to use "Join Site"
                // For now, let's treat it as email exists to keep it simple and secure
                this.logger.warn('Registration failed: email exists globally', { email: data.email });
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

            const newUserDTO: CreateUserDTO = {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                profilePic: data.profilePic
            };

            user = await this.userRepository.create(newUserDTO);

            // Fetch 'USER' role for this tenant
            // Need a way to get roles from repo - for now I'll assume we have a way or use a default ID if we had one
            // Better: repository.addTenant should find the default role if not provided? 
            // no, let's find it here or in the controller.

            // To be safe, I'll use a placeholder and fix it if I need a RoleRepository
            // Actually, I'll just assume the first 'USER' role for the tenant.

            // For now, let's use the userRepository.addTenant method 
            // which I'll update to handle default roles if needed, 
            // but here I need the roleId.

            // I'll add a temporary findRoleByName to userRepository or similar.
            // Wait, I'll just use a direct prisma call for now if I don't have a RoleRepository.
            // Actually, I should probably have a RoleRepository.

            const role = await (prisma as any).role.findFirst({
                where: { name: 'USER', tenantId: currentTenantId }
            });

            if (!role) {
                this.logger.error('DEFAULT_ROLE_NOT_FOUND', { currentTenantId });
                throw new Error(`Default role 'USER' not found for tenant. Please ensure the tenant is correctly initialized.`);
            }

            await this.userRepository.addTenant(user.id, currentTenantId, role.id);

            // Fetch user with role and permissions for JWT
            const userWithRole = await this.userRepository.findById(user.id, {
                includeRole: true,
                includePermissions: true
            });

            if (!userWithRole) {
                throw new Error('User creation failed');
            }

            // Resolve the specific tenant context for the token
            const userTenant = userWithRole.tenants?.find(ut => ut.tenantId === currentTenantId);

            const token = this.tokenGenerator.generate({
                id: userWithRole.id,
                email: userWithRole.email,
                name: userWithRole.name,
                role: {
                    id: userTenant?.role?.id || '',
                    name: userTenant?.role?.name || '',
                    level: userTenant?.role?.level || 0
                },
                tenantId: currentTenantId
            });

            const { password: _, ...safeUser } = userWithRole;

            this.logger.info('User registered successfully', { userId: userWithRole.id, email: userWithRole.email });

            // Enqueue welcome email asynchronously
            await this.queueProvider.enqueue('notifications', {
                type: 'WELCOME_EMAIL',
                email: userWithRole.email,
                name: userWithRole.name,
                tenantId: currentTenantId,
                origin: origin
            }).catch(err => {
                this.logger.error('Failed to enqueue welcome email', { userId: userWithRole.id, error: err.message });
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
}

