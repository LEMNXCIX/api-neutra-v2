import { AppointmentStatus } from "@/core/entities/appointment.entity";
import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from "class-validator";

export interface CreateAppointmentDTO {
    userId: string;
    serviceId: string;
    staffId: string;
    startTime: Date;
    notes?: string;
    couponCode?: string;
}

export interface AppointmentMutationActor {
    id: string;
    canManage: boolean;
    canDelete: boolean;
}

export interface UpdateAppointmentDTO {
    startTime?: Date;
    serviceId?: string;
    staffId?: string;
    status?: AppointmentStatus;
    notes?: string;
    cancellationReason?: string;
}

export interface AppointmentFilters {
    userId?: string;
    staffId?: string;
    serviceId?: string;
    status?: AppointmentStatus;
    startDate?: Date;
    endDate?: Date;
}

export interface CancelAppointmentDTO {
    reason?: string;
}

export interface GetAvailabilityDTO {
    staffId: string;
    serviceId: string;
    date: string;
    timezoneOffset?: string;
}

/**
 * The body of `POST /api/appointments`.
 *
 * Field set from what the use case and the repository actually read, not from
 * `CreateAppointmentDTO` alone: `endTime` is not a field of either (the
 * repository derives it from the service duration), and nothing on this
 * endpoint reads anything else. `userId` is optional here and required on the
 * interface because `AppointmentController.create` computes it — a body value
 * is honoured only when the actor holds `appointments:write` and can manage,
 * otherwise the actor's own id is used — so the DTO must not claim the client
 * always supplies it.
 */
export class CreateAppointmentDto {
    @IsString()
    @IsNotEmpty()
    serviceId!: string;

    @IsString()
    @IsNotEmpty()
    staffId!: string;

    @IsDateString()
    startTime!: Date | string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    couponCode?: string;
}

/** The body of `PUT /api/appointments/:id/cancel`: `reason` and nothing else. */
export class CancelAppointmentDto implements CancelAppointmentDTO {
    @IsOptional()
    @IsString()
    reason?: string;
}

/**
 * The body of `PUT /api/appointments/:id/status`.
 *
 * `AppointmentStatus` is asserted rather than left to
 * `assertAppointmentStatus` in the use case, so a typo is a 400 at the edge
 * instead of a domain error after the appointment has been read.
 */
export class UpdateAppointmentStatusDto {
    @IsEnum(AppointmentStatus)
    status!: AppointmentStatus;

    @IsOptional()
    @IsString()
    reason?: string;
}
