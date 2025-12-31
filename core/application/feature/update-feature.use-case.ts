import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';
import { Feature } from '@/core/entities/feature.entity';
import { ILogger } from '@/core/providers/logger.interface';

export class UpdateFeatureUseCase {
    constructor(
        private featureRepository: IFeatureRepository,
        private logger: ILogger
    ) { }

    async execute(id: string, data: Partial<Feature>): Promise<Feature> {
        const existing = await this.featureRepository.findById(id);
        if (!existing) {
            throw new Error('Feature not found');
        }

        if (data.key && data.key !== existing.key) {
            const collision = await this.featureRepository.findByKey(data.key);
            if (collision) {
                throw new Error(`Feature with key ${data.key} already exists`);
            }
        }

        this.logger.info(`Updating feature: ${id}`);
        return this.featureRepository.update(id, data);
    }
}
