import { IUserRepository } from '@/core/repositories/user.repository.interface';

export class GetUsersStatsUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(tenantId?: string) {
        try {
            const stats = await this.userRepository.getUsersStats(tenantId);

            const data = stats.map(r => ({
                _id: r.yearMonth,
                total: r.total
            }));

            return {
                success: true,
                code: 200,
                message: "Se realiza la obtencion de las ultimos usuarios creados.",
                data: data
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error fetching user stats",
                errors: error
            };
        }
    }
}
