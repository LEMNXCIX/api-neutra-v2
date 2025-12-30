import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class DeleteFeatureUseCase {
    constructor(
        private featureRepository: IFeatureRepository,
        private logger: ILogger
    ) { }

    async execute(id: string): Promise<void> {
        const existing = await this.featureRepository.findById(id);
        if (!existing) {
            throw new Error('Feature not found');
        }

        this.logger.warn(`Deleting feature: ${id} (${existing.key})`);
        return this.featureRepository.delete(id);
    }
}
