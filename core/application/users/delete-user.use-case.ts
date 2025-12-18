import { IUserRepository } from '@/core/repositories/user.repository.interface';

export class DeleteUserUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(tenantId: string | undefined, id: string) {
        const existingUser = await this.userRepository.findById(tenantId, id);

        if (!existingUser) {
            return {
                success: false,
                code: 404,
                message: 'User not found',
                data: null
            };
        }

        await this.userRepository.delete(tenantId, id);

        return {
            success: true,
            code: 200,
            message: 'User deleted successfully',
            data: null
        };
    }
}
