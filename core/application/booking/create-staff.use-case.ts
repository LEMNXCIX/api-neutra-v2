import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { CreateStaffDTO } from "@/core/application/dtos/requests/staff.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { ValidationError } from "@/core/domain/errors/domain-errors";

export class CreateStaffUseCase {
    constructor(
        private staffRepository: IStaffRepository,
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository,
    ) {}

    async execute(
        tenantId: string,
        data: CreateStaffDTO,
    ): Promise<UseCaseResult> {
        if (!data.name) {
            throw new ValidationError("Name is required");
        }

        let userId = data.userId;

        if (!userId && data.email) {
            const user = await this.userRepository.findByEmail(data.email);
            if (user) {
                userId = user.id;
            }
        }

        if (userId) {
            const role = await this.roleRepository.findByName(
                tenantId,
                "STAFF",
            );

            if (role) {
                await this.userRepository.addTenant(userId, tenantId, role.id);
            }
        }

        const staff = await this.staffRepository.create(tenantId, {
            ...data,
            userId,
        });

        return Success(staff, "Staff member created successfully");
    }
}
