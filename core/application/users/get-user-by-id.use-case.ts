import { IUserRepository } from '@/core/repositories/user.repository.interface';

export class GetUserByIdUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(tenantId: string | undefined, id: string) {
        try {
            const user = await this.userRepository.findById(id, { includeRole: true });

            if (!user) {
                return {
                    success: true,
                    code: 200,
                    message: "",
                    data: null
                };
            }

            // If tenantId is provided, ensure user belongs to it
            if (tenantId) {
                const belongsToTenant = user.tenants?.some(ut => ut.tenantId === tenantId || ut.tenant?.slug === tenantId);
                if (!belongsToTenant) {
                    return {
                        success: true,
                        code: 200,
                        message: "User not found in this tenant",
                        data: null
                    };
                }
            }

            return {
                success: true,
                code: 200,
                message: "",
                data: user
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error fetching user by id",
                errors: error
            };
        }
    }
}
