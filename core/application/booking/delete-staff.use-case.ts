import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class DeleteStaffUseCase {
    constructor(private staffRepository: IStaffRepository) {}

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const existingStaff = await this.staffRepository.findById(tenantId, id);
        if (!existingStaff) {
            throw new EntityNotFoundError("Staff", id);
        }

        await this.staffRepository.delete(tenantId, id);

        return Success(undefined, "Staff member deleted successfully");
    }
}
