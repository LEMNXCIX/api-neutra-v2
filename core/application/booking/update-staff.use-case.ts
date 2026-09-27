import {
    IStaffRepository,
    UpdateStaffData,
} from "@/core/repositories/staff.repository.interface";
import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { UpdateStaffDTO } from "@/core/application/dtos/requests/staff.request";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { BusinessErrorCodes } from "@/types/error-codes";
import { getStaffDayKeysClosedByBusinessHours } from "@/core/domain/booking/working-hours";

export class UpdateStaffUseCase {
    constructor(
        private staffRepository: IStaffRepository,
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository,
        private tenantRepository: ITenantRepository,
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

        if (data.workingHours !== undefined) {
            const tenant = await this.tenantRepository.findById(tenantId);
            const closedDays = getStaffDayKeysClosedByBusinessHours(
                data.workingHours,
                tenant?.config?.settings?.businessHours,
            );
            if (closedDays.length > 0) {
                throw new BusinessRuleViolationError(
                    `Staff working hours include active ranges on closed business day: ${closedDays.join(", ")}`,
                    BusinessErrorCodes.STAFF_HOURS_CONFLICT,
                );
            }
        }

        // A stored null userId means "unlinked", not "clear the link": the
        // repository forwards this to Prisma, where undefined is a no-op and
        // null would write NULL over an existing link.
        let userId = data.userId || existingStaff.userId || undefined;

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

        const updateData: UpdateStaffData = { ...data, userId };
        const staff = await this.staffRepository.update(tenantId, id, updateData);

        return Success(staff, "Staff member updated successfully");
    }
}
