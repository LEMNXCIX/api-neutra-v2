import { IUserRepository } from '@/core/repositories/user.repository.interface';

export class GetUsersSummaryStatsUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute() {
        try {
            const stats = await this.userRepository.getSummaryStats();
            return {
                success: true,
                code: 200,
                message: "User summary statistics retrieved successfully",
                data: stats
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error fetching user summary statistics",
                errors: error.message || error
            };
        }
    }
}
