import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class DeleteUserUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(
        tenantId: string | undefined,
        id: string,
    ): Promise<UseCaseResult> {
        const existingUser = await this.userRepository.findById(id);

        if (!existingUser) {
            throw new EntityNotFoundError("User", id);
        }

        await this.userRepository.delete(id);

        return Success(null, "User deleted successfully");
    }
}
