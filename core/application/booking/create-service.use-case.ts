import { IServiceRepository } from "@/core/repositories/service.repository.interface";
import { ICategoryRepository } from "@/core/repositories/category.repository.interface";
import { CreateServiceDTO } from "@/core/application/dtos/requests/service.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ValidationError,
    BusinessRuleViolationError,
} from "@/core/domain/errors/domain-errors";

export class CreateServiceUseCase {
    constructor(
        private serviceRepository: IServiceRepository,
        private categoryRepository: ICategoryRepository,
    ) {}

    async execute(
        tenantId: string,
        data: CreateServiceDTO,
    ): Promise<UseCaseResult> {
        if (!data.name || !data.duration || data.price === undefined) {
            throw new ValidationError("Missing required fields");
        }

        if (data.duration <= 0) {
            throw new ValidationError("Duration must be positive");
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

        const service = await this.serviceRepository.create(tenantId, data);

        return Success(service, "Service created successfully");
    }
}
