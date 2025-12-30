import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';
import { Feature } from '@/core/entities/feature.entity';

export class GetFeaturesUseCase {
    constructor(private featureRepository: IFeatureRepository) { }

    async execute(): Promise<Feature[]> {
        return this.featureRepository.findAll();
    }
}
