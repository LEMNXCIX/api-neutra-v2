import { IUserRepository } from '../../core/repositories/user.repository.interface';
import { IPasswordHasher, ITokenGenerator } from '../../core/providers/auth-providers.interface';

export class LoginUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenGenerator: ITokenGenerator
    ) { }

    async execute(data: any) {
        const { email, password } = data;

        if (!email || !password) {
            return {
                success: false,
                code: 400,
                message: "Email and password are required",
                errors: ["Email and password are required"]
            };
        }

        const user = await this.userRepository.findByEmail(email);

        if (!user || !user.password) {
            return {
                success: false,
                code: 401,
                message: "Invalid credentials",
                errors: ["Invalid credentials"]
            };
        }

        const isValid = await this.passwordHasher.compare(password, user.password);

        if (!isValid) {
            return {
                success: false,
                code: 401,
                message: "Invalid credentials",
                errors: ["Invalid credentials"]
            };
        }

        const token = this.tokenGenerator.generate({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        });

        // Sanitize user for response
        const { password: _, ...safeUser } = user;

        return {
            success: true,
            code: 200,
            message: "Login successful",
            data: { ...safeUser, token }
        };
    }
}
