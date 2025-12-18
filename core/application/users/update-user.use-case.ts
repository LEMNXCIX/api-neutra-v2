import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { User } from '@/core/entities/user.entity';

export class UpdateUserUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(tenantId: string | undefined, id: string, data: Partial<User>) {
        const existingUser = await this.userRepository.findById(tenantId, id);

        if (!existingUser) {
            return {
                success: false,
                code: 404,
                message: 'User not found',
                data: null
            };
        }

        const updatedUser = await this.userRepository.update(tenantId, id, data);

        return {
            success: true,
            code: 200,
            message: 'User updated successfully',
            data: updatedUser
        };
    }
}
