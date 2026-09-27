import { ITokenGenerator } from "@/core/providers/auth-providers.interface";
import { ICacheProvider } from "@/core/providers/cache-provider.interface";
import { IUserRepository } from "@/core/repositories/user.repository.interface";
import {
    ROLE_CONSTANTS,
    TENANT_CONSTANTS,
} from "@/core/domain/constants";
import {
    ForbiddenError,
    UnauthorizedError,
} from "@/core/domain/errors/domain-errors";
import { AuthenticatedUser } from "@/core/domain/auth.types";
import { AuthErrorCodes, TenantErrorCodes } from "@/types/error-codes";

export type ResolveAuthInput = {
    token: string;
    tenantId?: string;
    tenantSlug?: string;
    /**
     * When false, the token is still verified and the account still has to
     * exist and be active, but the account is not required to belong to the
     * requested tenant.
     *
     * This is the join-tenant flow and nothing else. A membership check is what
     * stops a valid token from being pointed at any tenant's data, so this flag
     * is never a default and never global: a route that sets it is a route whose
     * entire job is to grant that membership, and it has to say so in its own
     * name. The permission cache is also skipped, because permissions for a
     * tenant the caller is about to join are not the ones being asked for.
     */
    requireTenantMembership?: boolean;
};

export type ResolveAuthResult = {
    user: AuthenticatedUser;
};

const PERMISSION_CACHE_TTL = 3600;
const CACHE_KEY_PREFIX = "user:permissions";

export class ResolveAuthenticatedUserUseCase {
    constructor(
        private tokenGenerator: ITokenGenerator,
        private userRepository: IUserRepository,
        private cache: ICacheProvider,
    ) {}

    async execute(input: ResolveAuthInput): Promise<ResolveAuthResult> {
        const decoded = this.tokenGenerator.verify(input.token);

        const requireMembership = input.requireTenantMembership !== false;

        const tenantId =
            input.tenantId || decoded.tenantId;

        // Permissions are cached per (user, tenant). When membership is not
        // being asserted, the tenant in the request is one the caller may not
        // belong to yet, so caching under it would file another tenant's
        // permissions under this user. Fall back to the tenant the token was
        // issued for, which is a tenant they demonstrably hold.
        const cacheTenantId = requireMembership
            ? tenantId
            : decoded.tenantId;
        const cacheKey = `${CACHE_KEY_PREFIX}:${decoded.id}:${cacheTenantId || "global"}`;

        const cachedPermissions = await this.cache.get(cacheKey);
        let permissions: string[] = [];

        // The cache is an optimization, so an entry it cannot understand must
        // degrade to the database read below rather than throw. JSON.parse
        // returns any JSON value, so the shape is checked before it is trusted,
        // and a hit that is an empty array is still a hit.
        let cached: string[] | null = null;
        if (cachedPermissions) {
            try {
                const parsed: unknown = JSON.parse(cachedPermissions);
                if (Array.isArray(parsed)) {
                    cached = parsed.filter(
                        (entry): entry is string => typeof entry === "string",
                    );
                }
            } catch {
                // Corrupt or truncated entry: treat as a miss and re-read.
            }
        }

        if (cached) {
            permissions = cached;
        } else {
            const user = await this.userRepository.findById(decoded.id, {
                includeRole: true,
                includePermissions: true,
            });

            if (!user) {
                throw new UnauthorizedError("User not found");
            }

            if (!user.active) {
                throw new ForbiddenError(
                    "Account is inactive",
                    AuthErrorCodes.ACCOUNT_INACTIVE,
                );
            }

            let userTenant = user.tenants?.find(
                (ut) =>
                    ut.tenantId === tenantId ||
                    (input.tenantSlug && ut.tenant?.slug === input.tenantSlug),
            );

            const globalSuperAdmin = user.tenants?.find(
                (ut) =>
                    ut.tenant?.slug === TENANT_CONSTANTS.SUPERADMIN_SLUG &&
                    ut.role?.name === ROLE_CONSTANTS.SUPER_ADMIN,
            );

            if (!userTenant && globalSuperAdmin) {
                userTenant = globalSuperAdmin;
            }

            // Security: a valid token does not grant access to tenants the
            // user is not a member of. Without this check, an attacker could
            // point x-tenant-id/x-tenant-slug at any tenant and read its data.
            // The join-tenant flow opts out by name, and is the only caller that
            // does; it grants the membership this check would otherwise refuse.
            if (
                requireMembership &&
                (!userTenant || !userTenant.role)
            ) {
                throw new ForbiddenError(
                    "User is not authorized for this tenant",
                    TenantErrorCodes.MEMBERSHIP_REQUIRED,
                );
            }

            if (userTenant && userTenant.role) {
                permissions =
                    userTenant.role.permissions?.map((p) => p.name) ?? [];

                decoded.role = {
                    id: userTenant.role.id,
                    name: userTenant.role.name,
                    level: userTenant.role.level,
                };

                if (tenantId) {
                    await this.cache.set(
                        `${CACHE_KEY_PREFIX}:${decoded.id}:${tenantId}`,
                        JSON.stringify(permissions),
                        PERMISSION_CACHE_TTL,
                    );
                }
            }
        }

        const authenticatedUser: AuthenticatedUser = {
            ...decoded,
            role: {
                ...decoded.role,
                permissions,
            },
        };

        return { user: authenticatedUser };
    }
}
