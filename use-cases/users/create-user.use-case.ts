import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { CreateUserDTO } from '@/core/entities/user.entity';

export class CreateUserUseCase {
    constructor(
        private userRepository: IUserRepository,
        private cartRepository: ICartRepository
    ) { }

    async execute(data: CreateUserDTO) {
        try {
            const user = await this.userRepository.create(data);

            // Create cart for new user
            await this.cartRepository.create(user.id);

            return {
                success: true,
                code: 201,
                message: "User created",
                data: { created: true, user }
            };
        } catch (error: any) {
            // Handle unique constraint violation (duplicate email)
            const msg = error.code === 'P2002' ? "Email already exists" : "Error creating user";

            return {
                success: false,
                code: 400,
                message: msg,
                errors: [error.message]
            };
        }
    }
}
