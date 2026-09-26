import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import {
    AppointmentStatus,
} from "@/core/entities/appointment.entity";
import {
    canTransitionAppointmentStatus,
    isAppointmentStatus,
} from "@/core/domain/appointment/appointment.policy";
import { AppointmentMutationActor } from "@/core/application/dtos/requests/appointment.request";
import { IQueueProvider } from "@/core/providers/queue-provider.interface";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    InvalidStateError,
    BusinessRuleViolationError,
    UnauthorizedError,
    ForbiddenError,
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
        status: unknown,
        actor: AppointmentMutationActor,
        reason?: string,
        origin?: string,
    ): Promise<UseCaseResult> {
        if (!actor?.id) {
            throw new UnauthorizedError();
        }
        if (!actor.canManage) {
            throw new ForbiddenError(
                "You need 'appointments:write' permission to update appointments",
            );
        }
        if (!isAppointmentStatus(status)) {
            throw new BusinessRuleViolationError(
                "Invalid appointment status",
                "INVALID_APPOINTMENT_STATUS",
            );
        }

        const appointment = await this.appointmentRepository.findById(
            tenantId,
            id,
            true,
        );
        if (!appointment) {
            throw new EntityNotFoundError("Appointment", id);
        }

        if (!canTransitionAppointmentStatus(appointment.status, status)) {
            throw new InvalidStateError(
                `Appointment cannot transition from '${appointment.status}' to '${status}'`,
                "INVALID_STATUS_TRANSITION",
            );
        }

        const features =
            status === AppointmentStatus.COMPLETED
                ? await this.featureRepository.getTenantFeatureStatus(tenantId)
                : undefined;

        const updated = await this.appointmentRepository.updateStatus(
            tenantId,
            id,
            {
                expectedStatus: appointment.status,
                status,
                reason,
                actorId: actor.id,
                ...(status === AppointmentStatus.COMPLETED &&
                    features?.LOYALTY === true && {
                        qualifyLoyalty: true as const,
                    }),
            },
        );
        if (!updated) {
            throw new InvalidStateError(
                "Appointment status changed before the update could be applied",
                "APPOINTMENT_STATUS_CONFLICT",
            );
        }

        const resolvedFeatures =
            features ??
            (await this.featureRepository.getTenantFeatureStatus(tenantId));
        const emailEnabled = resolvedFeatures["EMAIL_NOTIFICATIONS"];

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
