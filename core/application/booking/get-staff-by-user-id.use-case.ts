import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class GetStaffByUserIdUseCase {
    constructor(private staffRepository: IStaffRepository) {}

    async execute(tenantId: string, userId: string): Promise<UseCaseResult> {
        const staff = await this.staffRepository.findByUserId(tenantId, userId);

        if (!staff) {
            throw new EntityNotFoundError("Staff", userId);
        }

        return Success(staff, "Staff profile retrieved successfully");
    }
}
