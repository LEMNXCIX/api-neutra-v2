import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { User } from "@/core/entities/user.entity";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class UpdateUserUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(
        tenantId: string | undefined,
        id: string,
        data: Partial<User>,
    ): Promise<UseCaseResult> {
        const existingUser = await this.userRepository.findById(id);

        if (!existingUser) {
            throw new EntityNotFoundError("User", id);
        }

        const updatedUser = await this.userRepository.update(id, data);

        return Success(updatedUser, "User updated successfully");
    }
}
