import { IUserRepository } from "@/core/repositories/user.repository.interface";
import {
    IPasswordHasher,
    ITokenGenerator,
} from "@/core/providers/auth-providers.interface";
import { ICacheProvider } from "@/core/providers/cache-provider.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
} from "@/core/domain/errors/domain-errors";
import { LoginDTO } from "@/core/application/dtos/requests/auth.request";

export class LoginUseCase {
    constructor(
        private userRepository: IUserRepository,
        private passwordHasher: IPasswordHasher,
        private tokenGenerator: ITokenGenerator,
        private cacheProvider: ICacheProvider,
    ) {}

    async execute(
        tenantId: string | undefined,
        data: LoginDTO,
    ): Promise<UseCaseResult> {
        const { email, password } = data;

        if (!email || !password) {
            throw new ValidationError("Email and password are required");
        }

        const user = await this.userRepository.findByEmail(email, {
            includeRole: true,
            includePermissions: true,
        });

        if (!user || !user.password) {
            throw new UnauthorizedError("Invalid credentials");
        }

        const isValid = await this.passwordHasher.compare(
            password,
            user.password,
        );

        if (!isValid) {
            throw new UnauthorizedError("Invalid credentials");
        }

        let userTenant = user.tenants?.find(
            (ut) => ut.tenantId === tenantId || ut.tenant?.slug === tenantId,
        );

        const globalSuperAdmin = user.tenants?.find(
            (ut) =>
                ut.tenant?.slug === "superadmin" &&
                ut.role?.name === "SUPER_ADMIN",
        );

        if (!userTenant && globalSuperAdmin) {
            userTenant = globalSuperAdmin;
        }

        if (!userTenant || !userTenant.role) {
            throw new ForbiddenError("User is not authorized for this tenant");
        }

        const permissions =
            userTenant.role.permissions?.map((p: { name: string }) => p.name) ??
            [];

        await this.cacheProvider.set(
            `user:permissions:${user.id}:${tenantId}`,
            JSON.stringify(permissions),
            3600,
        );

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

        return Success(
            {
                ...safeUser,
                token,
                role: userTenant.role,
                roleId: userTenant.roleId,
            },
            "Login successful",
        );
    }
}
