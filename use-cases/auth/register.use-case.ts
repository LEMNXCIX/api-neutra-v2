import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IPasswordHasher, ITokenGenerator } from '@/core/providers/auth-providers.interface';
import { CreateUserDTO } from '@/core/entities/user.entity';
import { ILogger } from '@/core/providers/logger.interface';

export class RegisterUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenGenerator: ITokenGenerator,
        private logger: ILogger
    ) { }

    async execute(data: any) {
        if (!data.email || !data.password || !data.name) {
            this.logger.warn('Registration failed: missing fields', { data });
            return {
                success: false,
                code: 400,
                message: "Missing required fields",
                errors: ["Missing required fields"]
            };
        }

        try {
            const existingUser = await this.userRepository.findByEmail(data.email);
            if (existingUser) {
                this.logger.warn('Registration failed: email already exists', { email: data.email });
                return {
                    success: false,
                    code: 400,
                    message: "Email already exists",
                    errors: ["Email already exists"]
                };
            }

            const hashedPassword = await this.passwordHasher.hash(data.password);

            const newUser: CreateUserDTO = {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: 'USER', // Default role
                profilePic: data.profilePic
            };

            const user = await this.userRepository.create(newUser);
            const token = this.tokenGenerator.generate({
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            });

            const { password: _, ...safeUser } = user;

            this.logger.info('User registered successfully', { userId: user.id, email: user.email });

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
                errors: [error.message]
            };
        }
    }
}
