import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { ITokenGenerator } from "@/core/providers/auth-providers.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ForbiddenError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { AuthErrorCodes, TenantErrorCodes } from "@/types/error-codes";

/**
 * The caller of registration: an existing identity that already holds an
 * account somewhere, attaching itself to another tenant without having to
 * retype the password it registered with there.
 *
 * RegisterUseCase reaches the same state by comparing passwords, which asks
 * someone to remember a credential in order to move between tenants. This
 * proves the same thing with the credential they already presented: the
 * middleware verified the token, and the account it names is who is joining.
 *
 * The membership is granted at the target tenant's default USER role and
 * nowhere else, so joining cannot be used to obtain a role the caller did not
 * already have.
 */
export type JoinTenantResult = {
    userId: string;
    email: string;
    name: string;
    tenantId: string;
    role: { id: string; name: string; level: number };
    token: string;
};

export class JoinTenantUseCase {
    constructor(
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository,
        private tenantRepository: ITenantRepository,
        private tokenGenerator: ITokenGenerator,
    ) {}

    async execute(
        targetTenantId: string | undefined,
        userId: string,
    ): Promise<UseCaseResult<JoinTenantResult>> {
        const tenant = targetTenantId?.trim();
        if (!tenant) {
            throw new ValidationError(
                "A concrete tenant context is required to join",
                TenantErrorCodes.TENANT_REQUIRED,
            );
        }
        if (!userId?.trim()) {
            throw new ValidationError("An authenticated user is required");
        }

        const target = await this.tenantRepository.findById(tenant);
        if (!target) {
            throw new EntityNotFoundError("Tenant", tenant);
        }
        if (!target.active) {
            throw new ForbiddenError(
                "This tenant is not accepting new members",
                TenantErrorCodes.TENANT_INACTIVE,
            );
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new EntityNotFoundError("User", userId);
        }
        if (!user.active) {
            throw new ForbiddenError(
                "Account is inactive",
                AuthErrorCodes.ACCOUNT_INACTIVE,
            );
        }

        const alreadyMember = user.tenants?.some(
            (ut) => ut.tenantId === target.id || ut.tenant?.slug === target.slug,
        );
        if (alreadyMember) {
            // Same situation registration reports, same code, so a client can
            // treat "you are already in" identically wherever it came from.
            throw new BusinessRuleViolationError(
                "You already have an account in this tenant.",
                AuthErrorCodes.ALREADY_MEMBER_OF_TENANT,
            );
        }

        const role = await this.roleRepository.findByName(target.id, "USER");
        if (!role) {
            throw new BusinessRuleViolationError(
                `This tenant has no default USER role and cannot accept new members.`,
            );
        }

        await this.userRepository.addTenant(user.id, target.id, role.id);

        const token = this.tokenGenerator.generate({
            id: user.id,
            email: user.email,
            name: user.name,
            role: { id: role.id, name: role.name, level: role.level },
            tenantId: target.id,
        });

        return Success(
            {
                userId: user.id,
                email: user.email,
                name: user.name,
                tenantId: target.id,
                role: { id: role.id, name: role.name, level: role.level },
                token,
            },
            "Joined tenant successfully",
        );
    }
}
