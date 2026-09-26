import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { User } from "@/core/entities/user.entity";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    ForbiddenError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { TenantErrorCodes } from "@/types/error-codes";

/**
 * A user belongs to several tenants (`UserTenant @@unique([userId, tenantId])`),
 * so the columns this endpoint writes — name, email, password, active — are the
 * customer's own account, not one tenant's copy of it. The write may only be
 * driven by a tenant the user actually belongs to, otherwise `users:manage` in
 * one tenant rewrites another tenant's customer, including their login
 * credentials.
 */
export class UpdateUserUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(
        tenantId: string | undefined,
        id: string,
        data: Partial<User>,
    ): Promise<UseCaseResult> {
        // Same rule as `hasConcreteTenant` in middleware/tenant-feature.middleware.ts
        // and `requireTenantId` in the loyalty controller: a cross-tenant ("all")
        // or missing context is not a tenant, and a write must never run on one.
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
                "You are not allowed to update this user in this tenant",
            );
        }

        const updatedUser = await this.userRepository.updateForTenant(
            tenant,
            id,
            data,
        );

        return Success(updatedUser, "User updated successfully");
    }
}
