import { IUserRepository } from '@/core/repositories/user.repository.interface';

export class GetUserByIdUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(id: string) {
        try {
            const user = await this.userRepository.findById(id);

            if (!user) {
                return {
                    success: true,
                    code: 200,
                    message: "",
                    data: null
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
                message: "Error fetching user by id",
                errors: error
            };
        }
    }
}
