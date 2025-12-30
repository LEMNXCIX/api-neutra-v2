import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { CreateUserDTO, User } from '@/core/entities/user.entity';
import * as uuid from 'uuid';
import { prisma } from '@/config/db.config';

export class SocialLoginUseCase {
    constructor(
        private userRepository: IUserRepository,
        private tokenGenerator: ITokenGenerator
    ) { }

    async execute(tenantId: string, data: any) {
        // data structure from passport profile
        const providerField = `${data.provider}Id`;
        const providerId = data.id;
        const email = data.emails && data.emails[0] ? data.emails[0].value : null;

        if (!providerId || !email) {
            return {
                success: false,
                code: 400,
                message: "Invalid provider data",
                errors: ["Invalid provider data"]
            };
        }

        // Check if user exists by provider globally
        let user = await this.userRepository.findByProvider(providerField, providerId);

        if (!user) {
            // Check if email exists globally to link
            user = await this.userRepository.findByEmail(email);

            if (user) {
                // Link account provider field
                user = await this.userRepository.update(user.id, {
                    [providerField]: providerId,
                    profilePic: data.photos && data.photos[0] ? data.photos[0].value : user.profilePic
                });
            } else {
                // Create new user globally
                const newUserDTO: CreateUserDTO = {
                    name: data.displayName || 'User',
                    email: email,
                    password: uuid.v4(), // Random password
                    [providerField]: providerId,
                    profilePic: data.photos && data.photos[0] ? data.photos[0].value : undefined
                };
                user = await this.userRepository.create(newUserDTO);
            }
        }

        // Ensure user is associated with the target tenant
        const alreadyInTenant = user.tenants?.some(ut => ut.tenantId === tenantId || ut.tenant?.slug === tenantId);

        if (!alreadyInTenant) {
            // Add user to the tenant with 'USER' role
            // We need the roleId. Simple fix: find role by name and tenantId
            // Actually, I'll use the prisma client directly for help if I don't have RoleRepository
            // Better would be to have a RoleRepository, but for now let's use the DB config
            const { prisma } = await import('@/config/db.config');
            const role = await prisma.role.findFirst({
                where: { name: 'USER', tenantId: tenantId }
            });

            if (!role) {
                throw new Error(`Default role 'USER' not found for tenant ${tenantId}`);
            }

            await this.userRepository.addTenant(user.id, tenantId, role.id);

            // Re-fetch user to get the new tenant relation
            user = await this.userRepository.findById(user.id, {
                includeRole: true,
                includePermissions: true
            }) as User;
        }

        // Resolve userTenant for the current context
        const userTenant = user.tenants?.find(ut => ut.tenantId === tenantId || ut.tenant?.slug === tenantId);

        if (!userTenant || !userTenant.role) {
            return {
                success: false,
                code: 403,
                message: "User not authorized for this tenant",
                errors: ["Failed to resolve role in target tenant"]
            };
        }

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

        if (!user) throw new Error('Social login user resolution failed');

        const { password: _, ...safeUser } = user;

        return {
            success: true,
            code: 200,
            message: "Login successful",
            data: { ...safeUser, token }
        };
    }
}
