import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class AssignStaffServiceUseCase {
    constructor(private staffRepository: IStaffRepository) {}

    async execute(
        tenantId: string,
        staffId: string,
        serviceId: string,
    ): Promise<UseCaseResult> {
        await this.staffRepository.assignService(tenantId, staffId, serviceId);

        return Success(null, "Service assigned to staff successfully");
    }
}
