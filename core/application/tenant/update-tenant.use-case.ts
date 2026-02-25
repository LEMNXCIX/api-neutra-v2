import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { Tenant } from '@/core/entities/tenant.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { TenantErrorCodes } from '@/types/error-codes';

export class UpdateTenantUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        private logger: ILogger
    ) { }

    async execute(id: string, data: Partial<Tenant>): Promise<UseCaseResult> {
        const existing = await this.tenantRepository.findById(id);
        if (!existing) {
            throw new AppError('Tenant not found', 404, TenantErrorCodes.TENANT_NOT_FOUND);
        }

        // If slug is changing, check for duplicates
        if (data.slug && data.slug !== existing.slug) {
            const slugExists = await this.tenantRepository.findBySlug(data.slug);
            if (slugExists) {
                throw new AppError('Tenant with this slug already exists', 400, TenantErrorCodes.TENANT_SLUG_EXISTS);
            }
        }

        // Merge config if present
        if (data.config) {
            data.config = {
                ...existing.config,
                ...(data.config || {}),
                branding: {
                    ...(existing.config?.branding || {}),
                    ...(data.config?.branding || {})
                },
                settings: {
                    ...(existing.config?.settings || {}),
                    ...(data.config?.settings || {})
                },
                features: {
                    ...(existing.config?.features || {}),
                    ...(data.config?.features || {})
                }
            };
        }

        const updated = await this.tenantRepository.update(id, data);

        return Success(updated, 'Tenant updated successfully');
    }
}
