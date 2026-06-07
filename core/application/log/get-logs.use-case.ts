import {
    ILogRepository,
    LogFilters,
} from "@/core/repositories/log.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetLogsUseCase {
    constructor(private logRepository: ILogRepository) {}

    async execute(filters: LogFilters): Promise<UseCaseResult> {
        const result = await this.logRepository.findAll(filters);

        return Success(
            {
                data: result.data,
                pagination: {
                    total: result.total,
                    skip: Number(filters.skip) || 0,
                    take: Number(filters.take) || 50,
                },
            },
            "Logs retrieved successfully",
        );
    }
}
