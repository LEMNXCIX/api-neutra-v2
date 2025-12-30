import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';

export class GetTenantFeaturesUseCase {
    constructor(private featureRepository: IFeatureRepository) { }

    async execute(tenantId: string): Promise<Record<string, boolean>> {
        return this.featureRepository.getTenantFeatureStatus(tenantId);
    }
}
