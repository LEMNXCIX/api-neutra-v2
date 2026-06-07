import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetUsersSummaryStatsUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(tenantId?: string): Promise<UseCaseResult> {
        const stats = await this.userRepository.getSummaryStats(tenantId);
        return Success(stats, "User summary statistics retrieved successfully");
    }
}
