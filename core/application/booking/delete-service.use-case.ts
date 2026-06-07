import { IServiceRepository } from "@/core/repositories/service.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class DeleteServiceUseCase {
    constructor(private serviceRepository: IServiceRepository) {}

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const existingService = await this.serviceRepository.findById(
            tenantId,
            id,
        );
        if (!existingService) {
            throw new EntityNotFoundError("Service", id);
        }

        await this.serviceRepository.delete(tenantId, id);

        return Success(undefined, "Service deleted successfully");
    }
}
