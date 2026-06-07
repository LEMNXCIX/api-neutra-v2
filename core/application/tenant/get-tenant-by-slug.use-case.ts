import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

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
            },
            "Tenant found",
        );
    }
}
