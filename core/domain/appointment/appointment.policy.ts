import { AppointmentStatus } from "@/core/entities/appointment.entity";

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
