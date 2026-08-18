import { IFeatureRepository, FeatureCreateData } from "@/core/repositories/feature.repository.interface";
import { CreateFeatureDTO } from "@/core/application/dtos/requests/feature.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    ValidationError,
    DuplicateEntityError,
} from "@/core/domain/errors/domain-errors";

export class CreateFeatureUseCase {
    constructor(private featureRepository: IFeatureRepository) {}

    async execute(data: CreateFeatureDTO): Promise<UseCaseResult> {
        if (!data.key || !data.name) {
            throw new ValidationError(
                "Key and Name are required",
                "MISSING_REQUIRED_FIELDS",
            );
        }

        const existing = await this.featureRepository.findByKey(data.key);
        if (existing) {
            throw new DuplicateEntityError("Feature", "key", data.key);
        }

        const createData: FeatureCreateData = {
            key: data.key,
            name: data.name,
            description: data.description,
            category: data.category,
            price: data.price,
        };
        const feature = await this.featureRepository.create(createData);
        return Success(feature, "Feature created successfully");
    }
}
