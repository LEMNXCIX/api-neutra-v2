import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { AppointmentMutationActor } from "@/core/application/dtos/requests/appointment.request";
import {
    EntityNotFoundError,
    UnauthorizedError,
    ForbiddenError,
} from "@/core/domain/errors/domain-errors";

export class DeleteAppointmentUseCase {
    constructor(private appointmentRepository: IAppointmentRepository) {}

    async execute(
        tenantId: string,
        id: string,
        actor: AppointmentMutationActor,
    ): Promise<UseCaseResult> {
        if (!actor?.id) {
            throw new UnauthorizedError();
        }
        if (!actor.canDelete) {
            throw new ForbiddenError(
                "You need 'appointments:delete' permission to delete appointments",
            );
        }

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
