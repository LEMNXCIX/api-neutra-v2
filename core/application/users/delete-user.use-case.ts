import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    ForbiddenError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { TenantErrorCodes } from "@/types/error-codes";

/**
 * A user belongs to several tenants (`UserTenant @@unique([userId, tenantId])`),
 * so deleting one is a whole-account operation that cascades into every tenant
 * the user touches. It may only be driven by a tenant the user actually belongs
 * to, otherwise `users:manage` in one tenant destroys another tenant's
 * customers.
 */
export class DeleteUserUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(
        tenantId: string | undefined,
        id: string,
    ): Promise<UseCaseResult> {
        // Same rule as `hasConcreteTenant` in middleware/tenant-feature.middleware.ts
        // and `requireTenantId` in the loyalty controller: a cross-tenant ("all")
        // or missing context is not a tenant, and a delete must never run on one.
        const tenant = tenantId?.trim();
        if (!tenant || tenant.toLowerCase() === "all") {
            throw new ValidationError(
                "A concrete tenant context is required",
                TenantErrorCodes.TENANT_REQUIRED,
            );
        }

        const existingUser = await this.userRepository.findByIdForTenant(
            tenant,
            id,
        );

        // Membership is part of the lookup, so "not a member" and "no such user"
        // are the same answer on purpose: a 404 here would confirm the id exists
        // somewhere, and the caller is authenticated and holds users:manage, so
        // 403 is the honest and consistent status (requirePermission answers 403
        // too). A global findById would have to be added just to tell the two
        // apart, which is the leak this closes.
        if (!existingUser) {
            throw new ForbiddenError(
                "You are not allowed to delete this user in this tenant",
            );
        }

        await this.userRepository.deleteForTenant(tenant, id);

        return Success(null, "User deleted successfully");
    }
}
