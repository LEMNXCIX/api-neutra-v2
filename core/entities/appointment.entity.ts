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

const APPOINTMENT_STATUS_TRANSITIONS: Readonly<
    Record<AppointmentStatus, readonly AppointmentStatus[]>
> = {
    [AppointmentStatus.PENDING]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
    ],
    [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
    ],
    [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED],
    [AppointmentStatus.NEEDS_REVIEW]: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.CANCELLED,
    ],
    [AppointmentStatus.COMPLETED]: [],
    [AppointmentStatus.CANCELLED]: [],
    [AppointmentStatus.NO_SHOW]: [],
};

const TERMINAL_APPOINTMENT_STATUSES = new Set<AppointmentStatus>([
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
]);

export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
    return (
        typeof value === "string" &&
        (Object.values(AppointmentStatus) as string[]).includes(value)
    );
}

export function canTransitionAppointmentStatus(
    currentStatus: AppointmentStatus,
    nextStatus: AppointmentStatus,
): boolean {
    return APPOINTMENT_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function isTerminalAppointmentStatus(
    status: AppointmentStatus,
): boolean {
    return TERMINAL_APPOINTMENT_STATUSES.has(status);
}

export interface Appointment {
    id: string;
    userId: string;
    serviceId: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    status: AppointmentStatus;
    statusChangedAt?: Date;
    statusChangeReason?: string;
    statusChangedById?: string;
    notes?: string;
    cancellationReason?: string;
    confirmationSent: boolean;
    reminderSent: boolean;
    tenantId: string;
    tenant?: { id: string; name: string; slug: string };
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
    return canTransitionAppointmentStatus(
        status,
        AppointmentStatus.CANCELLED,
    );
}

export function isCustomerCancellable(status: AppointmentStatus): boolean {
    return (
        status === AppointmentStatus.PENDING ||
        status === AppointmentStatus.CONFIRMED
    );
}

export function isModifiable(status: AppointmentStatus): boolean {
    return !isTerminalAppointmentStatus(status);
}

export function hasStarted(status: AppointmentStatus): boolean {
    return (
        status === AppointmentStatus.IN_PROGRESS ||
        status === AppointmentStatus.COMPLETED
    );
}
