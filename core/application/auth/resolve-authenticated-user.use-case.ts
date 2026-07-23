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

export type ResolveAuthInput = {
    token: string;
    tenantId?: string;
    tenantSlug?: string;
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

        const tenantId =
            input.tenantId || decoded.tenantId;
        const cacheKey = `${CACHE_KEY_PREFIX}:${decoded.id}:${tenantId || "global"}`;

        const cachedPermissions = await this.cache.get(cacheKey);
        let permissions: string[] = [];

        if (cachedPermissions) {
            permissions = JSON.parse(cachedPermissions);
        } else {
            const user = await this.userRepository.findById(decoded.id, {
                includeRole: true,
                includePermissions: true,
            });

            if (!user) {
                throw new UnauthorizedError("User not found");
            }

            if (!user.active) {
                throw new ForbiddenError("Account is inactive");
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
