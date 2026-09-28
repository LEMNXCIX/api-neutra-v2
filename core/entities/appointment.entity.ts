/**
 * Appointment Entity
 * Represents a booking/appointment
 */

export enum AppointmentStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    IN_PROGRESS = "IN_PROGRESS",
    NEEDS_REVIEW = "NEEDS_REVIEW",
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
    statusChangedAt: Date | null;
    statusChangeReason: string | null;
    statusChangedById: string | null;
    notes: string | null;
    cancellationReason: string | null;
    confirmationSent: boolean;
    reminderSent: boolean;
    tenantId: string;
    tenant?: { id: string; name: string; slug: string };
    createdAt: Date;
    updatedAt: Date;

    // Coupon info
    couponId: string | null;
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
