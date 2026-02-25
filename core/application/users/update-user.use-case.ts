import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { User } from '@/core/entities/user.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class UpdateUserUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(tenantId: string | undefined, id: string, data: Partial<User>): Promise<UseCaseResult> {
        const existingUser = await this.userRepository.findById(id);

        if (!existingUser) {
            throw new AppError('User not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        const updatedUser = await this.userRepository.update(id, data);

        return Success(updatedUser, 'User updated successfully');
    }
}
