import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetStaffUseCase {
    constructor(private staffRepository: IStaffRepository) {}

    async execute(
        tenantId: string | undefined,
        activeOnly: boolean = true,
    ): Promise<UseCaseResult> {
        const staffList = await this.staffRepository.findAll(
            tenantId,
            activeOnly,
        );

        return Success(staffList, "Staff retrieved successfully");
    }
}
