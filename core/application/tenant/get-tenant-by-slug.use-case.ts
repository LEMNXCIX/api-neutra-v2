import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetTenantBySlugUseCase {
    constructor(private tenantRepository: ITenantRepository) {}

    async execute(slug: string): Promise<UseCaseResult> {
        const tenant = await this.tenantRepository.findBySlug(slug);

        if (!tenant) {
            throw new EntityNotFoundError("Tenant", slug);
        }

        return Success(
            {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                type: tenant.type,
                active: tenant.active,
                config: tenant.config,
            },
            "Tenant found",
        );
    }
}
