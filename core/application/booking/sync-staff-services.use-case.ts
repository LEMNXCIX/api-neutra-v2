import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { ValidationError } from "@/core/domain/errors/domain-errors";

export class SyncStaffServicesUseCase {
    constructor(private staffRepository: IStaffRepository) {}

    async execute(
        tenantId: string,
        staffId: string,
        serviceIds: string[],
    ): Promise<UseCaseResult> {
        if (!Array.isArray(serviceIds)) {
            throw new ValidationError("serviceIds must be an array");
        }

        await this.staffRepository.syncServices(tenantId, staffId, serviceIds);

        return Success(null, "Staff services synchronized successfully");
    }
}
