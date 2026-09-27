import {
    IStaffRepository,
    CreateStaffData,
} from "@/core/repositories/staff.repository.interface";
import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { CreateStaffDTO } from "@/core/application/dtos/requests/staff.request";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    BusinessRuleViolationError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { BusinessErrorCodes } from "@/types/error-codes";
import { getStaffDayKeysClosedByBusinessHours } from "@/core/domain/booking/working-hours";

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
