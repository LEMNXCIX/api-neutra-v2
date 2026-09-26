import { IUserRepository, UserCreateData } from "@/core/repositories/user.repository.interface";
import {
    IPasswordHasher,
    ITokenGenerator,
} from "@/core/providers/auth-providers.interface";
import { CreateUserDTO } from "@/core/application/dtos/requests/user.request";
import { IQueueProvider } from "@/core/providers/queue-provider.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    ValidationError,
    DuplicateEntityError,
    EntityNotFoundError,
    BusinessRuleViolationError,
} from "@/core/domain/errors/domain-errors";
import { AuthErrorCodes } from "@/types/error-codes";
import type { ILogger } from "@/core/providers/logger.interface";

export class RegisterUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenGenerator: ITokenGenerator,
        private queueProvider: IQueueProvider,
        private tenantRepository: ITenantRepository,
        private roleRepository: IRoleRepository,
        private logger: ILogger,
    ) {}

    async execute(
        tenantId: string | undefined,
        data: CreateUserDTO,
        origin?: string,
    ): Promise<UseCaseResult> {
        let resolvedTenantId = tenantId;
        if (!resolvedTenantId) {
            const superadminTenant =
                await this.tenantRepository.findBySlug("superadmin");
            resolvedTenantId = superadminTenant?.id;
        }

        if (!resolvedTenantId) {
            throw new EntityNotFoundError("Tenant", resolvedTenantId!);
        }

        const currentTenantId = resolvedTenantId;

        if (!data.email || !data.password || !data.name) {
            throw new ValidationError("Email, password, and name are required");
        }

        let user = await this.userRepository.findByEmail(data.email);

        if (user) {
            const alreadyInTenant = user.tenants?.some(
                (ut) =>
                    ut.tenantId === currentTenantId ||
                    ut.tenant?.slug === currentTenantId,
            );
            if (alreadyInTenant) {
                throw new DuplicateEntityError(
                    "User",
                    "tenant",
                    currentTenantId,
                );
            }

            const passwordMatches = await this.passwordHasher.compare(
                data.password,
                user.password ?? "",
            );

            if (!passwordMatches) {
                throw new BusinessRuleViolationError(
                    "An account with this email already exists. Use the same password to join this tenant.",
                    AuthErrorCodes.USER_ALREADY_EXISTS,
                );
            }
        } else {
            const hashedPassword = await this.passwordHasher.hash(data.password);

            const newUserData: UserCreateData = {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                profilePic: data.profilePic,
            };

            user = await this.userRepository.create(newUserData);
        }

        const role = await this.roleRepository.findByName(
            currentTenantId,
            "USER",
        );

        if (!role) {
            throw new BusinessRuleViolationError(
                `Default role 'USER' not found for tenant. Please ensure the tenant is correctly initialized.`,
            );
        }

        await this.userRepository.addTenant(user.id, currentTenantId, role.id);

        const userWithRole = await this.userRepository.findById(user.id, {
            includeRole: true,
            includePermissions: true,
        });

        if (!userWithRole) {
            throw new BusinessRuleViolationError("User creation failed");
        }

        const userTenant = userWithRole.tenants?.find(
            (ut) => ut.tenantId === currentTenantId,
        );

        const token = this.tokenGenerator.generate({
            id: userWithRole.id,
            email: userWithRole.email,
            name: userWithRole.name,
            role: {
                id: userTenant?.role?.id || "",
                name: userTenant?.role?.name || "",
                level: userTenant?.role?.level || 0,
            },
            tenantId: currentTenantId,
        });

        const { password: _, ...safeUser } = userWithRole;

          // The welcome email is not allowed to fail the registration, so the
          // enqueue is not awaited. It used to swallow the rejection entirely,
          // which made a permanently broken queue provider indistinguishable
          // from a healthy one. Logged with the same context pattern
          // CreateOrderUseCase uses for its non-fatal confirmation email.
          this.queueProvider
              .enqueue("notifications", {
                  type: "WELCOME_EMAIL",
                  email: userWithRole.email,
                  name: userWithRole.name,
                  tenantId: currentTenantId,
                  origin: origin,
              })
              .catch((error: unknown) => {
                  this.logger.error(
                      "Failed to enqueue welcome email for new user",
                      error,
                      {
                          userId: userWithRole.id,
                          tenantId: currentTenantId,
                          email: userWithRole.email,
                      },
                  );
              });

        return Success({ ...safeUser, token }, "User created successfully");
    }
}
