import { IUserRepository } from '../../core/repositories/user.repository.interface';

export class GetAllUsersUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute() {
        try {
            const users = await this.userRepository.findAll();

            return {
                success: true,
                code: 200,
                message: "",
                data: users
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error fetching users",
                errors: error
            };
        }
    }
}
