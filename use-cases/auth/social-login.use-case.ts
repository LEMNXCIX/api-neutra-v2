import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { CreateUserDTO } from '@/core/entities/user.entity';
import * as uuid from 'uuid';

export class SocialLoginUseCase {
    constructor(
        private userRepository: IUserRepository,
        private tokenGenerator: ITokenGenerator
    ) { }

    async execute(data: any) {
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

        let user = await this.userRepository.findByProvider(providerField, providerId);

        if (!user) {
            // Check if email exists to link
            user = await this.userRepository.findByEmail(email);

            if (user) {
                // Link account
                user = await this.userRepository.update(user.id, {
                    [providerField]: providerId,
                    profilePic: data.photos && data.photos[0] ? data.photos[0].value : user.profilePic
                });
            } else {
                // Create new user
                const newUser: CreateUserDTO = {
                    name: data.displayName || 'User',
                    email: email,
                    password: uuid.v4(), // Random password
                    [providerField]: providerId,
                    role: 'USER',
                    profilePic: data.photos && data.photos[0] ? data.photos[0].value : undefined
                };
                user = await this.userRepository.create(newUser);
            }
        }

        const token = this.tokenGenerator.generate({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        });

        const { password: _, ...safeUser } = user;

        return {
            success: true,
            code: 200,
            message: "Login successful",
            data: { ...safeUser, token }
        };
    }
}
