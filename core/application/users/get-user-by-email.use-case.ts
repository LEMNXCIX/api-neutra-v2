import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetUserByEmailUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(
        tenantId: string | undefined,
        email: string,
        includePassword: boolean = false,
    ): Promise<UseCaseResult> {
        const user = await this.userRepository.findByEmail(email, {
            includeRole: true,
        });

        if (!user) {
            return Success(null, "");
        }

        if (tenantId) {
            const belongsToTenant = user.tenants?.some(
                (ut) =>
                    ut.tenantId === tenantId || ut.tenant?.slug === tenantId,
            );
            if (!belongsToTenant) {
                return Success(null, "User not found in this tenant");
            }
        }

        if (!includePassword && user.password) {
            const { password, ...safeUser } = user;
            return Success(safeUser, "");
        }

        return Success(user, "");
    }
}
