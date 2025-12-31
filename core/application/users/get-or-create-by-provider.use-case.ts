import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import * as uuid from 'uuid';

interface ProviderData {
    provider: string;
    idProvider: string;
    name: string;
    email: string;
    profilePic?: string;
}

export class GetOrCreateByProviderUseCase {
    constructor(
        private userRepository: IUserRepository,
        private cartRepository: ICartRepository
    ) { }

    async execute(tenantId: string | undefined, data: ProviderData) {
        const providerField = `${data.provider}Id`; // e.g., 'googleId', 'facebookId'

        try {
            // Find user by provider ID globally
            let user = await this.userRepository.findByProvider(providerField, data.idProvider);

            let created = false;

            if (!user) {
                // Check if email exists to link account
                const existingUser = await this.userRepository.findByEmail(data.email);

                if (existingUser) {
                    // Link provider to existing user
                    user = await this.userRepository.linkProvider(
                        data.email,
                        providerField,
                        data.idProvider,
                        data.profilePic
                    );
                } else {
                    // Create new user globally
                    const newPassword = uuid.v4(); // Random password for provider users

                    user = await this.userRepository.create({
                        name: data.name,
                        email: data.email,
                        password: newPassword,
                        profilePic: data.profilePic,
                        [providerField]: data.idProvider
                    });
                    created = true;
                }
            }

            // Ensure belonging to current tenant
            if (tenantId) {
                const alreadyInTenant = user.tenants?.some(ut => ut.tenantId === tenantId || ut.tenant?.slug === tenantId);

                if (!alreadyInTenant) {
                    // Add user to the tenant with 'USER' role
                    const { prisma } = await import('@/config/db.config');
                    const role = await prisma.role.findFirst({
                        where: { name: 'USER', tenantId: tenantId }
                    });

                    if (role) {
                        await this.userRepository.addTenant(user.id, tenantId, role.id);
                    }

                    // Create cart for user in this tenant
                    await this.cartRepository.create(tenantId, user.id);

                    // Refresh user to get relations
                    user = await this.userRepository.findById(user.id, { includeRole: true }) as any;
                }
            }

            return {
                success: true,
                code: created ? 201 : 200,
                message: created ? "User created via provider" : "User found or linked",
                data: { created, user }
            };

            // User already exists
            return {
                success: true,
                code: 200,
                message: "",
                data: { created: false, user }
            };

        } catch (error: any) {
            return {
                success: false,
                code: 400,
                message: "Error creating user by provider",
                errors: error.message
            };
        }
    }
}
