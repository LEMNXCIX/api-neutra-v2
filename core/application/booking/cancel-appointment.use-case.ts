import type { AppointmentMutationActor } from "@/core/application/dtos/requests/appointment.request";
import {
    isCancellable,
    isCustomerCancellable,
} from "@/core/domain/appointment/appointment.policy";
import {
    EntityNotFoundError,
    ForbiddenError,
    InvalidStateError,
    UnauthorizedError,
} from "@/core/domain/errors/domain-errors";
import { AppointmentStatus } from "@/core/entities/appointment.entity";
import type { IQueueProvider } from "@/core/providers/queue-provider.interface";
import type { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import type { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";
import { BusinessErrorCodes } from "@/types/error-codes";

export class CancelAppointmentUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private featureRepository: IFeatureRepository,
        private queueProvider: IQueueProvider,
    ) {}

    async execute(
        tenantId: string,
        id: string,
        actor: AppointmentMutationActor,
        reason?: string,
    ): Promise<UseCaseResult> {
        if (!actor?.id) {
            throw new UnauthorizedError();
        }

        const appointment = await this.appointmentRepository.findById(
            tenantId,
            id,
            true,
        );

        if (!appointment) {
            throw new EntityNotFoundError("Appointment", id);
        }

        const isOwner = appointment.userId === actor.id;
        if (!isOwner && !actor.canManage) {
            throw new ForbiddenError(
                "You can only cancel your own appointments",
            );
        }
        if (!actor.canManage && !isCustomerCancellable(appointment.status)) {
            throw new ForbiddenError(
                "Customers can only cancel pending or confirmed appointments",
            );
        }
        if (!isCancellable(appointment.status)) {
            throw new InvalidStateError(
                `Appointment with status '${appointment.status}' cannot be cancelled`,
                BusinessErrorCodes.INVALID_STATUS_TRANSITION,
            );
        }

        const updated = await this.appointmentRepository.updateStatus(
            tenantId,
            id,
            {
                expectedStatus: appointment.status,
                status: AppointmentStatus.CANCELLED,
                reason,
                actorId: actor.id,
                cancellationReason: reason,
            },
        );
        if (!updated) {
            throw new InvalidStateError(
                "Appointment status changed before it could be cancelled",
                BusinessErrorCodes.APPOINTMENT_STATUS_CONFLICT,
            );
        }

        const features =
            await this.featureRepository.getTenantFeatureStatus(tenantId);
        if (features.EMAIL_NOTIFICATIONS) {
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
