import { ForgotPasswordUseCase } from "@/core/application/auth/forgot-password.use-case";
import { JoinTenantUseCase } from "@/core/application/auth/join-tenant.use-case";
import { LoginUseCase } from "@/core/application/auth/login.use-case";
import { RegisterUseCase } from "@/core/application/auth/register.use-case";
import { ResetPasswordUseCase } from "@/core/application/auth/reset-password.use-case";
import { SocialLoginUseCase } from "@/core/application/auth/social-login.use-case";
import { CreateFeatureUseCase } from "@/core/application/feature/create-feature.use-case";
import { DeleteFeatureUseCase } from "@/core/application/feature/delete-feature.use-case";
import { GetFeaturesUseCase } from "@/core/application/feature/get-features.use-case";
import { UpdateFeatureUseCase } from "@/core/application/feature/update-feature.use-case";
import { CreatePermissionUseCase } from "@/core/application/permissions/create-permission.use-case";
import { DeletePermissionUseCase } from "@/core/application/permissions/delete-permission.use-case";
import { GetPermissionsUseCase } from "@/core/application/permissions/get-permissions.use-case";
import { GetPermissionsPaginatedUseCase } from "@/core/application/permissions/get-permissions-paginated.use-case";
import { UpdatePermissionUseCase } from "@/core/application/permissions/update-permission.use-case";
import { CreateRoleUseCase } from "@/core/application/roles/create-role.use-case";
import { DeleteRoleUseCase } from "@/core/application/roles/delete-role.use-case";
import { GetRolesUseCase } from "@/core/application/roles/get-roles.use-case";
import { GetRolesPaginatedUseCase } from "@/core/application/roles/get-roles-paginated.use-case";
import { UpdateRoleUseCase } from "@/core/application/roles/update-role.use-case";
import { CreateTenantUseCase } from "@/core/application/tenant/create-tenant.use-case";
import { DeleteTenantUseCase } from "@/core/application/tenant/delete-tenant.use-case";
import { GetMyTenantsUseCase } from "@/core/application/tenant/get-my-tenants.use-case";
import { GetTenantByIdUseCase } from "@/core/application/tenant/get-tenant-by-id.use-case";
import { GetTenantBySlugUseCase } from "@/core/application/tenant/get-tenant-by-slug.use-case";
import { GetTenantFeaturesUseCase } from "@/core/application/tenant/get-tenant-features.use-case";
import { GetTenantsUseCase } from "@/core/application/tenant/get-tenants.use-case";
import { UpdateTenantUseCase } from "@/core/application/tenant/update-tenant.use-case";
import { UpdateTenantFeaturesUseCase } from "@/core/application/tenant/update-tenant-features.use-case";
import { AssignRoleToUserUseCase } from "@/core/application/users/assign-role.use-case";
import { CreateUserUseCase } from "@/core/application/users/create-user.use-case";
import { DeleteUserUseCase } from "@/core/application/users/delete-user.use-case";
import { GetAllUsersUseCase } from "@/core/application/users/get-all-users.use-case";
import { GetOrCreateByProviderUseCase } from "@/core/application/users/get-or-create-by-provider.use-case";
import { GetUserByEmailUseCase } from "@/core/application/users/get-user-by-email.use-case";
import { GetUserByIdUseCase } from "@/core/application/users/get-user-by-id.use-case";
import { GetUsersStatsUseCase } from "@/core/application/users/get-users-stats.use-case";
import { GetUsersSummaryStatsUseCase } from "@/core/application/users/get-users-summary-stats.use-case";
import { UpdateUserUseCase } from "@/core/application/users/update-user.use-case";
import { AuthController } from "@/interface-adapters/controllers/auth.controller";
import { FeatureController } from "@/interface-adapters/controllers/feature.controller";
import { PermissionController } from "@/interface-adapters/controllers/permission.controller";
import { RoleController } from "@/interface-adapters/controllers/role.controller";
import { TenantController } from "@/interface-adapters/controllers/tenant.controller";
import { UserController } from "@/interface-adapters/controllers/user.controller";
import type { Runtime } from "../runtime";

export function createIdentityControllers(runtime: Runtime) {
    const r = runtime.repositories;
    const p = runtime.providers;

    return {
        auth: new AuthController(
            new LoginUseCase(
                r.user,
                p.passwordHasher,
                p.tokenGenerator,
                p.cache,
            ),
            new RegisterUseCase(
                r.user,
                p.passwordHasher,
                p.tokenGenerator,
                p.queue,
                r.tenant,
                r.role,
                p.logger,
            ),
            new SocialLoginUseCase(r.user, p.tokenGenerator, r.role, p.uid),
            new ForgotPasswordUseCase(r.user, p.queue, p.config, p.crypto),
            new ResetPasswordUseCase(r.user, p.passwordHasher),
            new JoinTenantUseCase(r.user, r.role, r.tenant, p.tokenGenerator),
        ),
        user: new UserController(
            new GetAllUsersUseCase(r.user),
            new GetUserByIdUseCase(r.user),
            new GetUserByEmailUseCase(r.user),
            new GetUsersStatsUseCase(r.user),
            new GetUsersSummaryStatsUseCase(r.user),
            new CreateUserUseCase(r.user, r.cart, r.role),
            new GetOrCreateByProviderUseCase(r.user, r.cart, r.role, p.uid),
            new UpdateUserUseCase(r.user),
            new DeleteUserUseCase(r.user),
            new AssignRoleToUserUseCase(r.user, r.role, r.staff, p.cache),
        ),
        tenant: new TenantController(
            new CreateTenantUseCase(
                r.tenant,
                r.user,
                r.role,
                r.permission,
                r.feature,
            ),
            new GetTenantsUseCase(r.tenant),
            new GetMyTenantsUseCase(r.tenant),
            new GetTenantByIdUseCase(r.tenant),
            new GetTenantBySlugUseCase(r.tenant),
            new UpdateTenantUseCase(r.tenant, r.feature, r.loyalty),
            new DeleteTenantUseCase(r.tenant),
            new GetTenantFeaturesUseCase(r.feature),
            new UpdateTenantFeaturesUseCase(r.feature, r.loyalty),
        ),
        role: new RoleController(
            new CreateRoleUseCase(r.role),
            new GetRolesUseCase(r.role),
            new UpdateRoleUseCase(r.role, r.user, p.cache),
            new DeleteRoleUseCase(r.role),
            new GetRolesPaginatedUseCase(r.role),
        ),
        permission: new PermissionController(
            new CreatePermissionUseCase(r.permission),
            new GetPermissionsUseCase(r.permission),
            new UpdatePermissionUseCase(r.permission),
            new DeletePermissionUseCase(r.permission),
            new GetPermissionsPaginatedUseCase(r.permission),
        ),
        feature: new FeatureController(
            new GetFeaturesUseCase(r.feature),
            new CreateFeatureUseCase(r.feature),
            new UpdateFeatureUseCase(r.feature),
            new DeleteFeatureUseCase(r.feature),
        ),
    };
}
