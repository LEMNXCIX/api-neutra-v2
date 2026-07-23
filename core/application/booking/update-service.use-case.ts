import {
    IServiceRepository,
    ServiceUpdateData,
} from "@/core/repositories/service.repository.interface";
import { ICategoryRepository } from "@/core/repositories/category.repository.interface";
import { UpdateServiceDTO } from "@/core/application/dtos/requests/service.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ValidationError,
    BusinessRuleViolationError,
} from "@/core/domain/errors/domain-errors";

export class UpdateServiceUseCase {
    constructor(
        private serviceRepository: IServiceRepository,
        private categoryRepository: ICategoryRepository,
    ) {}

    async execute(
        tenantId: string,
        id: string,
        data: UpdateServiceDTO,
    ): Promise<UseCaseResult> {
        if (data.name === "") {
            throw new ValidationError("Name cannot be empty");
        }

        const existingService = await this.serviceRepository.findById(
            tenantId,
            id,
        );
        if (!existingService) {
            throw new EntityNotFoundError("Service", id);
        }

        if (data.categoryId) {
            const category = await this.categoryRepository.findById(
                tenantId,
                data.categoryId,
            );
            if (!category) {
                throw new BusinessRuleViolationError(
                    "Category not found or does not belong to your account",
                );
            }
        }

        const updateData: ServiceUpdateData = { ...data };
        const service = await this.serviceRepository.update(
            tenantId,
            id,
            updateData,
        );

        return Success(service, "Service updated successfully");
    }
}
