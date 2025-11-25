import { IUserRepository } from '@/core/repositories/user.repository.interface';

export class GetUserByEmailUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(email: string, includePassword: boolean = false) {
        try {
            const user = await this.userRepository.findByEmail(email);

            if (!user) {
                return {
                    success: true,
                    code: 200,
                    message: "",
                    data: null
                };
            }

            // If password should not be included, remove it
            if (!includePassword && user.password) {
                const { password, ...safeUser } = user;
                return {
                    success: true,
                    code: 200,
                    message: "",
                    data: safeUser
                };
            }

            return {
                success: true,
                code: 200,
                message: "",
                data: user
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error fetching user by email",
                errors: error
            };
        }
    }
}
