
import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class GetTenantBySlugUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private logger: ILogger
    ) { }

    async execute(slug: string) {
        try {
            const tenant = await this.tenantRepository.findBySlug(slug);

            if (!tenant) {
                return {
                    success: false,
                    message: 'Tenant not found',
                    code: 404
                };
            }

            return {
                success: true,
                message: 'Tenant found',
                code: 200,
                data: {
                    id: tenant.id,
                    name: tenant.name,
                    slug: tenant.slug,
                    type: tenant.type,
                    active: tenant.active
                }
            };
        } catch (error) {
            this.logger.error(`Error fetching tenant by slug: ${slug}`, error);
            return {
                success: false,
                message: 'Error fetching tenant configuration',
                code: 500
            };
        }
    }
}
