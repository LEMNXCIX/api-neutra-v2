import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetUserByIdUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(
        tenantId: string | undefined,
        id: string,
    ): Promise<UseCaseResult> {
        const user = await this.userRepository.findById(id, {
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

        return Success(user, "");
    }
}
