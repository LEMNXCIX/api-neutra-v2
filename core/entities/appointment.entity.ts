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
    user?: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        pushToken?: string;
    };
    service?: { id: string; name: string; duration: number; price: number };
    staff?: { id: string; name: string; email?: string; avatar?: string };
    coupon?: { id: string; code: string; type: string; value: number };
}

export function isCancellable(status: AppointmentStatus): boolean {
    return (
        status === AppointmentStatus.PENDING ||
        status === AppointmentStatus.CONFIRMED
    );
}

export function isModifiable(status: AppointmentStatus): boolean {
    return (
        status !== AppointmentStatus.COMPLETED &&
        status !== AppointmentStatus.CANCELLED
    );
}

export function hasStarted(status: AppointmentStatus): boolean {
    return (
        status === AppointmentStatus.IN_PROGRESS ||
        status === AppointmentStatus.COMPLETED
    );
}
