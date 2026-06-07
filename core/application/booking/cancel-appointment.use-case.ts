import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { IQueueProvider } from "@/core/providers/queue-provider.interface";
import {
    AppointmentStatus,
    isCancellable,
} from "@/core/entities/appointment.entity";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    InvalidStateError,
} from "@/core/domain/errors/domain-errors";

export class CancelAppointmentUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private featureRepository: IFeatureRepository,
        private queueProvider: IQueueProvider,
    ) {}

    async execute(
        tenantId: string,
        id: string,
        reason?: string,
    ): Promise<UseCaseResult> {
        const appointment = await this.appointmentRepository.findById(
            tenantId,
            id,
            true,
        );

        if (!appointment) {
            throw new EntityNotFoundError("Appointment", id);
        }

        if (!isCancellable(appointment.status)) {
            throw new InvalidStateError(
                `Appointment with status '${appointment.status}' cannot be cancelled`,
                "INVALID_STATUS_TRANSITION",
            );
        }

        const updated = await this.appointmentRepository.update(tenantId, id, {
            status: AppointmentStatus.CANCELLED,
            cancellationReason: reason,
        });

        const features =
            await this.featureRepository.getTenantFeatureStatus(tenantId);
        if (features["EMAIL_NOTIFICATIONS"]) {
            await this.queueProvider.enqueue("notifications", {
                type: "CANCELLED",
                appointmentId: id,
                tenantId,
                reason,
            });
        }

        return Success(updated, "Appointment cancelled successfully");
    }
}
