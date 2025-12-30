import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';
import { Feature, CreateFeatureDTO } from '@/core/entities/feature.entity';
import { ILogger } from '@/core/providers/logger.interface';

export class CreateFeatureUseCase {
    constructor(
        private featureRepository: IFeatureRepository,
        private logger: ILogger
    ) { }

    async execute(data: CreateFeatureDTO): Promise<Feature> {
        if (!data.key || !data.name) {
            throw new Error('Key and Name are required');
        }

        const existing = await this.featureRepository.findByKey(data.key);
        if (existing) {
            throw new Error(`Feature with key ${data.key} already exists`);
        }

        this.logger.info(`Creating new feature: ${data.name} (${data.key})`);
        return this.featureRepository.create(data);
    }
}
