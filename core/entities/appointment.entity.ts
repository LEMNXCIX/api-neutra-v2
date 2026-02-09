/**
 * Appointment Entity
 * Represents a booking/appointment
 */

export enum AppointmentStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    NO_SHOW = "NO_SHOW",
}

export interface Appointment {
    id: string;
    userId: string;
    serviceId: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    status: AppointmentStatus;
    notes?: string;
    cancellationReason?: string;
    confirmationSent: boolean;
    reminderSent: boolean;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;

    // Coupon info
    couponId?: string;
    discountAmount: number;
    subtotal: number;
    total: number;

    // Populated relations (optional)
    user?: any;
    service?: any;
    staff?: any;
    coupon?: any;
}

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
