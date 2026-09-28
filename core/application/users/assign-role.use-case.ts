import {
    EntityNotFoundError,
    ForbiddenError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import type { ICacheProvider } from "@/core/providers/cache-provider.interface";
import type { IRoleRepository } from "@/core/repositories/role.repository.interface";
import type { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import type { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";
import { TenantErrorCodes } from "@/types/error-codes";

/**
 * `addTenant` is an upsert on `UserTenant @@unique([userId, tenantId])`, so
 * assigning a role is a write that creates membership, not a read: reached with
 * a tenant-free lookup it takes a user who belongs only to some other tenant
 * and grants them this tenant's role. The role read next to it was already
 * scoped, so the elevation is real — a tenant-A ADMIN role hands the outsider
 * tenant A, and a STAFF role also gets them a Staff row in tenant A.
 *
 * Same class as the delete and update holes: this may only be driven by a
 * tenant the user actually belongs to.
 */
export class AssignRoleToUserUseCase {
    constructor(
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository,
        private staffRepository: IStaffRepository,
        private cacheProvider: ICacheProvider,
    ) {}

    async execute(
        tenantId: string | undefined,
        userId: string,
        roleId: string,
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

        // Membership is part of the lookup, so "not a member" and "no such user"
        // are the same answer on purpose: a 404 here would confirm the id exists
        // somewhere, and the caller is authenticated and holds users:manage, so
        // 403 is the honest and consistent status (requirePermission answers 403
        // too). A global findById would have to be added just to tell the two
        // apart, which is the leak this closes.
        const user = await this.userRepository.findByIdForTenant(
            tenant,
            userId,
        );
        if (!user) {
            throw new ForbiddenError(
                "You are not allowed to assign a role to this user in this tenant",
            );
        }

        const role = await this.roleRepository.findById(tenant, roleId);
        if (!role) {
            throw new EntityNotFoundError("Role", roleId);
        }

        // Add/Update user-tenant relation with new roleId
        await this.userRepository.addTenant(userId, tenant, roleId);

        // STAFF Sync Logic: If new role is STAFF, Ensure Staff record exists
        if (role.name === "STAFF") {
            const existingStaff = await this.staffRepository.findByUserId(
                tenant,
                userId,
            );
            if (!existingStaff) {
                await this.staffRepository.create(tenant, {
                    userId: userId,
                    name: user.name,
                    email: user.email,
                    active: true,
                    workingHours: {},
                });
            } else if (!existingStaff.active) {
                await this.staffRepository.update(tenant, existingStaff.id, {
                    active: true,
                });
            }
        } else {
            const existingStaff = await this.staffRepository.findByUserId(
                tenant,
                userId,
            );
            if (existingStaff?.active) {
                await this.staffRepository.update(tenant, existingStaff.id, {
                    active: false,
                });
            }
        }

        // Fetch user with updated role info
        const updatedUser = await this.userRepository.findByIdForTenant(
            tenant,
            userId,
            { includeRole: true },
        );

        // Invalidate user permissions cache for this specific tenant context
        await this.cacheProvider.del(`user:permissions:${userId}:${tenant}`);

        return Success(updatedUser, "Role assigned successfully");
    }
}
