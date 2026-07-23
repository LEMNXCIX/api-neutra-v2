import { IUserRepository, UserCreateData } from "@/core/repositories/user.repository.interface";
import { ITokenGenerator } from "@/core/providers/auth-providers.interface";
import { IUidProvider } from "@/core/providers/uid-provider.interface";
import { CreateUserDTO } from "@/core/application/dtos/requests/user.request";
import { SocialLoginDTO } from "@/core/application/dtos/requests/auth.request";
import { User } from "@/core/entities/user.entity";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    BusinessRuleViolationError,
    ForbiddenError,
} from "@/core/domain/errors/domain-errors";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";

export class SocialLoginUseCase {
    constructor(
        private userRepository: IUserRepository,
        private tokenGenerator: ITokenGenerator,
        private roleRepository: IRoleRepository,
        private uidProvider: IUidProvider,
    ) {}

    async execute(
        tenantId: string,
        data: SocialLoginDTO,
    ): Promise<UseCaseResult> {
        const providerField = `${data.provider}Id`;
        const providerId = data.id;
        const email =
            data.emails && data.emails[0] ? data.emails[0].value : null;

        if (!providerId || !email) {
            throw new BusinessRuleViolationError("Invalid provider data");
        }

        let user = await this.userRepository.findByProvider(
            providerField,
            providerId,
        );

        if (!user) {
            user = await this.userRepository.findByEmail(email);

            if (user) {
                user = await this.userRepository.update(user.id, {
                    [providerField]: providerId,
                    profilePic:
                        data.photos && data.photos[0]
                            ? data.photos[0].value
                            : user.profilePic,
                });
            } else {
                const newUserData: UserCreateData = {
                    name: data.displayName || "User",
                    email: email,
                    password: this.uidProvider.generate(),
                    [providerField]: providerId,
                    profilePic:
                        data.photos && data.photos[0]
                            ? data.photos[0].value
                            : undefined,
                };
                user = await this.userRepository.create(newUserData);
            }
        }

        const alreadyInTenant = user.tenants?.some(
            (ut) => ut.tenantId === tenantId || ut.tenant?.slug === tenantId,
        );

        if (!alreadyInTenant) {
            const role = await this.roleRepository.findByName(tenantId, "USER");

            if (!role) {
                throw new BusinessRuleViolationError(
                    `Default role 'USER' not found for tenant ${tenantId}`,
                    "TENANT_NOT_FOUND",
                );
            }

            await this.userRepository.addTenant(user.id, tenantId, role.id);

            user = (await this.userRepository.findById(user.id, {
                includeRole: true,
                includePermissions: true,
            })) as User;
        }

        const userTenant = user.tenants?.find(
            (ut) => ut.tenantId === tenantId || ut.tenant?.slug === tenantId,
        );

        if (!userTenant || !userTenant.role) {
            throw new ForbiddenError("User not authorized for this tenant");
        }

        const token = this.tokenGenerator.generate({
            id: user.id,
            email: user.email,
            name: user.name,
            role: {
                id: userTenant.role.id,
                name: userTenant.role.name,
                level: userTenant.role.level,
            },
            tenantId: userTenant.tenantId,
        });

        const { password: _, ...safeUser } = user;

        return Success({ ...safeUser, token }, "Login successful");
    }
}
