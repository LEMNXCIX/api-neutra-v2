import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class DeleteAppointmentUseCase {
    constructor(private appointmentRepository: IAppointmentRepository) {}

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const appointment = await this.appointmentRepository.findById(
            tenantId,
            id,
        );

        if (!appointment) {
            throw new EntityNotFoundError("Appointment", id);
        }

        await this.appointmentRepository.delete(tenantId, id);

        return Success(null, "Appointment deleted successfully");
    }
}
