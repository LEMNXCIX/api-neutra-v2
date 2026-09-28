import type { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetAllUsersUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(tenantId?: string): Promise<UseCaseResult> {
        const users = await this.userRepository.findAll(tenantId);
        return Success(users);
    }
}
