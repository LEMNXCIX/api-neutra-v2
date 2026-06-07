import { AppointmentStatus } from "@/core/entities/appointment.entity";

export interface CreateAppointmentDTO {
    userId: string;
    serviceId: string;
    staffId: string;
    startTime: Date;
    notes?: string;
    couponCode?: string;
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
