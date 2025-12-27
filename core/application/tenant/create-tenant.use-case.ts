
import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { Tenant, TenantType, TenantConfig } from '@/core/entities/tenant.entity';

export interface CreateTenantDTO {
    name: string;
    slug: string;
    type: TenantType;
    config?: TenantConfig;
}

export class CreateTenantUseCase {
    constructor(
        private tenantRepository: ITenantRepository,
        privatelogger: ILogger
    ) { }

    async execute(data: CreateTenantDTO) {
        try {
            // Check if slug exists
            const existing = await this.tenantRepository.findBySlug(data.slug);
            if (existing) {
                return {
                    code: 400,
                    success: false,
                    message: 'Tenant with this slug already exists',
                };
            }

            const tenant = await this.tenantRepository.create({
                name: data.name,
                slug: data.slug,
                type: data.type,
                config: data.config,
                active: true,
            });

            return {
                code: 201,
                success: true,
                data: tenant,
            };
        } catch (error: any) {
            return {
                code: 500,
                success: false,
                message: 'Error creating tenant',
            };
        }
    }
}
