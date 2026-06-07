import { IServiceRepository } from "@/core/repositories/service.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetServicesUseCase {
    constructor(private serviceRepository: IServiceRepository) {}

    async execute(
        tenantId: string | undefined,
        activeOnly: boolean = true,
    ): Promise<UseCaseResult> {
        const services = await this.serviceRepository.findAll(
            tenantId,
            activeOnly,
        );

        return Success(services, "Services retrieved successfully");
    }
}
