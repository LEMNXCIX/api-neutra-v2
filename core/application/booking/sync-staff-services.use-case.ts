import { ValidationError } from "@/core/domain/errors/domain-errors";
import type { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

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
