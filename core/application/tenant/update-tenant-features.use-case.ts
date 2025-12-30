import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';

export class UpdateTenantFeaturesUseCase {
    constructor(private featureRepository: IFeatureRepository) { }

    async execute(tenantId: string, features: Record<string, boolean>): Promise<void> {
        return this.featureRepository.updateTenantFeatures(tenantId, features);
    }
}
