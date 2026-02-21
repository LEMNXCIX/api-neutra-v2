import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class DeleteUserUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(tenantId: string | undefined, id: string): Promise<UseCaseResult> {
        const existingUser = await this.userRepository.findById(id);

        if (!existingUser) {
            throw new AppError('User not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        await this.userRepository.delete(id);

        return Success(null, 'User deleted successfully');
    }
}
