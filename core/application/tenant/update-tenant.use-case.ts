import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { Tenant } from '@/core/entities/tenant.entity';

export class UpdateTenantUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private logger: ILogger
    ) { }

    async execute(id: string, data: Partial<Tenant>) {
        try {
            const existing = await this.tenantRepository.findById(id);
            if (!existing) {
                return {
                    code: 404,
                    success: false,
                    message: 'Tenant not found',
                };
            }

            // If slug is changing, check for duplicates
            if (data.slug && data.slug !== existing.slug) {
                const slugExists = await this.tenantRepository.findBySlug(data.slug);
                if (slugExists) {
                    return {
                        code: 400,
                        success: false,
                        message: 'Tenant with this slug already exists',
                    };
                }
            }

            const updated = await this.tenantRepository.update(id, data);

            return {
                code: 200,
                success: true,
                data: updated,
            };
        } catch (error: any) {
            this.logger.error('Error updating tenant', error, { tenantId: id });
            return {
                code: 500,
                success: false,
                message: 'Error updating tenant',
            };
        }
    }
}
