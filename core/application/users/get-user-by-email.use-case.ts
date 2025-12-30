import { IUserRepository } from '@/core/repositories/user.repository.interface';

export class GetUserByEmailUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(tenantId: string | undefined, email: string, includePassword: boolean = false) {
        try {
            const user = await this.userRepository.findByEmail(email, { includeRole: true });

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

            // If password should not be included, remove it
            if (!includePassword && user.password) {
                const { password, ...safeUser } = user;
                return {
                    success: true,
                    code: 200,
                    message: "",
                    data: safeUser
                };
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
                message: "Error fetching user by email",
                errors: error
            };
        }
    }
}
