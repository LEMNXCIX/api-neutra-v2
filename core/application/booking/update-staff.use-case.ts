import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { UpdateStaffDTO } from "@/core/application/dtos/requests/staff.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";

export class UpdateStaffUseCase {
    constructor(
        private staffRepository: IStaffRepository,
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository,
    ) {}

    async execute(
        tenantId: string,
        id: string,
        data: UpdateStaffDTO,
    ): Promise<UseCaseResult> {
        if (data.name === "") {
            throw new ValidationError("Name cannot be empty");
        }

        const existingStaff = await this.staffRepository.findById(tenantId, id);
        if (!existingStaff) {
            throw new EntityNotFoundError("Staff", id);
        }

        let userId = data.userId || existingStaff.userId;

        if (!userId && (data.email || existingStaff.email)) {
            const emailToSearch = data.email || existingStaff.email;
            if (emailToSearch) {
                const user =
                    await this.userRepository.findByEmail(emailToSearch);
                if (user) {
                    userId = user.id;
                }
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

        const staff = await this.staffRepository.update(tenantId, id, {
            ...data,
            userId,
        });

        return Success(staff, "Staff member updated successfully");
    }
}
