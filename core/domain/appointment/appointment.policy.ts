import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";
import { AppointmentStatus } from "@/core/entities/appointment.entity";
import { BusinessErrorCodes } from "@/types/error-codes";

/**
 * The single owner of which appointment status a caller may set by hand.
 *
 * NEEDS_REVIEW is deliberately absent, and its absence is the point: the status
 * means nobody recorded the outcome of an appointment that has already
 * happened, which is a fact about the schedule rather than a decision a member
 * of staff gets to make. Only the sweep may set it, through
 * canSystemFlagForReview below. The public graph and the system graph answer
 * different questions, and conflating them is what let the sweep write
 * NEEDS_REVIEW directly from the repository for as long as it did, with nothing
 * in the domain able to say whether that was allowed.
 */
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

export function isAppointmentStatus(
    value: unknown,
): value is AppointmentStatus {
    return (
        typeof value === "string" &&
        (Object.values(AppointmentStatus) as string[]).includes(value)
    );
}

/**
 * Single owner of the INVALID_APPOINTMENT_STATUS rule: the use case (path
 * parameter) and the controller (query filter) both call this instead of
 * re-throwing it, so the code lives in one layer.
 */
export function assertAppointmentStatus(
    value: unknown,
): asserts value is AppointmentStatus {
    if (!isAppointmentStatus(value)) {
        throw new BusinessRuleViolationError(
            "Invalid appointment status",
            BusinessErrorCodes.INVALID_APPOINTMENT_STATUS,
        );
    }
}

export function canTransitionAppointmentStatus(
    currentStatus: AppointmentStatus,
    nextStatus: AppointmentStatus,
): boolean {
    return APPOINTMENT_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

/**
 * The system half of the lifecycle, and the only way to reach NEEDS_REVIEW.
 *
 * A sweep may flag any appointment that is still recorded as running, because
 * the status of a booking whose window has closed is unresolved and somebody has
 * to look at it. It may not touch an appointment that has already reached a
 * decision, and it may not re-flag one already in review, which is what keeps a
 * sweep from walking a NEEDS_REVIEW appointment further along.
 *
 * This lives beside the public graph rather than inside it so the two rules stay
 * distinguishable: canTransitionAppointmentStatus answers "may a caller set
 * this", this one answers "may the system flag this". The sweep consults it
 * before writing, which it did not used to do, so a status the system rules out
 * is now refused in the domain instead of being written regardless.
 */
const SYSTEM_FLAGGABLE_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.IN_PROGRESS,
]);

export function canSystemFlagForReview(
    currentStatus: AppointmentStatus,
): boolean {
    return SYSTEM_FLAGGABLE_STATUSES.has(currentStatus);
}

export function isTerminalAppointmentStatus(
    status: AppointmentStatus,
): boolean {
    return TERMINAL_APPOINTMENT_STATUSES.has(status);
}

export function isCancellable(status: AppointmentStatus): boolean {
    return canTransitionAppointmentStatus(status, AppointmentStatus.CANCELLED);
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
