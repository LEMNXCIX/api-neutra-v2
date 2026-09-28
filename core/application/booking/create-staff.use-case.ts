import type { CreateStaffDTO } from "@/core/application/dtos/requests/staff.request";
import { getStaffDayKeysClosedByBusinessHours } from "@/core/domain/booking/working-hours";
import {
    BusinessRuleViolationError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import type { IRoleRepository } from "@/core/repositories/role.repository.interface";
import type {
    CreateStaffData,
    IStaffRepository,
} from "@/core/repositories/staff.repository.interface";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import type { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";
import { BusinessErrorCodes } from "@/types/error-codes";

export class CreateStaffUseCase {
    constructor(
        private staffRepository: IStaffRepository,
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository,
        private tenantRepository: ITenantRepository,
    ) {}

    async execute(
        tenantId: string,
        data: CreateStaffDTO,
    ): Promise<UseCaseResult> {
        if (!data.name) {
            throw new ValidationError("Name is required");
        }

        if (data.workingHours) {
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

        const staffData: CreateStaffData = { ...data, userId };
        const staff = await this.staffRepository.create(tenantId, staffData);

        return Success(staff, "Staff member created successfully");
    }
}
