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
            // Find user by provider ID
            let user = await this.userRepository.findByProvider(tenantId, providerField, data.idProvider);

            if (!user) {
                // Check if email exists to link account
                const existingUser = await this.userRepository.findByEmail(tenantId, data.email);

                if (existingUser) {
                    // Link provider to existing user
                    user = await this.userRepository.linkProvider(
                        tenantId,
                        data.email,
                        providerField,
                        data.idProvider,
                        data.profilePic
                    );

                    return {
                        success: true,
                        code: 200,
                        message: "User linked to provider",
                        data: { created: false, user }
                    };
                }

                // Create new user with provider
                const newPassword = uuid.v4(); // Random password for provider users

                user = await this.userRepository.create(tenantId, {
                    name: data.name,
                    email: data.email,
                    password: newPassword,
                    profilePic: data.profilePic,
                    [providerField]: data.idProvider
                });

                // Create cart for new user
                await this.cartRepository.create(tenantId, user.id);

                return {
                    success: true,
                    code: 201,
                    message: "User created via provider",
                    data: { created: true, user }
                };
            }

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
