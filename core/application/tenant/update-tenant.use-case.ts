import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    DuplicateEntityError,
} from "@/core/domain/errors/domain-errors";
import { UpdateTenantDTO } from "@/core/application/dtos/requests/tenant.request";

export class UpdateTenantUseCase {
    constructor(private tenantRepository: ITenantRepository) {}

    async execute(id: string, data: UpdateTenantDTO): Promise<UseCaseResult> {
        const existing = await this.tenantRepository.findById(id);
        if (!existing) {
            throw new EntityNotFoundError("Tenant", id);
        }

        // If slug is changing, check for duplicates
        if (data.slug && data.slug !== existing.slug) {
            const slugExists = await this.tenantRepository.findBySlug(
                data.slug,
            );
            if (slugExists) {
                throw new DuplicateEntityError("Tenant", "slug", data.slug);
            }
        }

        // Merge config if present
        if (data.config) {
            data.config = {
                ...existing.config,
                ...(data.config || {}),
                branding: {
                    ...(existing.config?.branding || {}),
                    ...(data.config?.branding || {}),
                },
                settings: {
                    ...(existing.config?.settings || {}),
                    ...(data.config?.settings || {}),
                },
                features: {
                    ...(existing.config?.features || {}),
                    ...(data.config?.features || {}),
                },
            };
        }

        const updated = await this.tenantRepository.update(id, data);

        return Success(updated, "Tenant updated successfully");
    }
}
