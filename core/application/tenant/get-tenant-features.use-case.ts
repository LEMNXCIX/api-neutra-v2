import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';

export class GetTenantFeaturesUseCase {
    constructor(private tenantRepository: ITenantRepository) { }

    async execute(tenantId: string): Promise<any> {
        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) {
            throw new Error('Tenant not found');
        }

        return tenant.config?.features || {};
    }
}
