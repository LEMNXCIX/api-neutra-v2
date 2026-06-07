import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetUsersStatsUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(tenantId?: string): Promise<UseCaseResult> {
        const stats = await this.userRepository.getUsersStats(tenantId);

        const data = stats.map((r) => ({
            _id: r.yearMonth,
            total: r.total,
        }));

        return Success(
            data,
            "Se realiza la obtencion de las ultimos usuarios creados.",
        );
    }
}
