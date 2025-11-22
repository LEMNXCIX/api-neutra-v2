import { IUserRepository } from '../../core/repositories/user.repository.interface';
import { IPasswordHasher, ITokenGenerator } from '../../core/providers/auth-providers.interface';
import { CreateUserDTO } from '../../core/entities/user.entity';

export class RegisterUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenGenerator: ITokenGenerator
    ) { }

    async execute(data: any) {
        if (!data.email || !data.password || !data.name) {
            return {
                success: false,
                code: 400,
                message: "Missing required fields",
                errors: ["Missing required fields"]
            };
        }

        const existingUser = await this.userRepository.findByEmail(data.email);
        if (existingUser) {
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

        try {
            const user = await this.userRepository.create(newUser);
            const token = this.tokenGenerator.generate({
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            });

            const { password: _, ...safeUser } = user;

            return {
                success: true,
                code: 201,
                message: "User created successfully",
                data: { ...safeUser, token }
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error creating user",
                errors: [error.message]
            };
        }
    }
}
