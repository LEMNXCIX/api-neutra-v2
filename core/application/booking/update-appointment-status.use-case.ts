import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import {
    AppointmentStatus,
    isModifiable,
    hasStarted,
} from "@/core/entities/appointment.entity";
import { IQueueProvider } from "@/core/providers/queue-provider.interface";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    InvalidStateError,
    BusinessRuleViolationError,
} from "@/core/domain/errors/domain-errors";

export class UpdateAppointmentStatusUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private queueProvider: IQueueProvider,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(
        tenantId: string,
        id: string,
        status: AppointmentStatus,
        origin?: string,
    ): Promise<UseCaseResult> {
        if (!status) {
            throw new BusinessRuleViolationError("Status is required");
        }

        const appointment = await this.appointmentRepository.findById(
            tenantId,
            id,
            true,
        );
        if (!appointment) {
            throw new EntityNotFoundError("Appointment", id);
        }

        if (!isModifiable(appointment.status)) {
            throw new InvalidStateError(
                `Appointment with status '${appointment.status}' cannot be modified`,
                "INVALID_STATUS_TRANSITION",
            );
        }

        if (
            status === AppointmentStatus.IN_PROGRESS &&
            !hasStarted(appointment.status)
        ) {
            throw new InvalidStateError(
                `Appointment cannot transition to IN_PROGRESS from '${appointment.status}'`,
                "INVALID_STATUS_TRANSITION",
            );
        }

        const updated = await this.appointmentRepository.updateStatus(
            tenantId,
            id,
            status,
        );

        const features =
            await this.featureRepository.getTenantFeatureStatus(tenantId);
        const emailEnabled = features["EMAIL_NOTIFICATIONS"];

        if (emailEnabled) {
            if (status === AppointmentStatus.CONFIRMED) {
                await this.queueProvider.enqueue("notifications", {
                    type: "CONFIRMED",
                    appointmentId: id,
                    tenantId: tenantId,
                    origin: origin,
                });
            } else if (status === AppointmentStatus.CANCELLED) {
                await this.queueProvider.enqueue("notifications", {
                    type: "CANCELLED",
                    appointmentId: id,
                    tenantId: tenantId,
                    origin: origin,
                });
            }
        }

        return Success(updated, `Appointment status updated to ${status}`);
    }
}
