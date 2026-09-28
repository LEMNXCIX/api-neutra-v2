import type {
    Appointment,
    AppointmentStatus,
} from "@/core/entities/appointment.entity";

export type AppointmentCreateData = {
    userId: string;
    serviceId: string;
    staffId: string;
    startTime: Date;
    notes?: string;
    couponCode?: string;
    couponId?: string;
    discountAmount?: number;
    subtotal?: number;
    total?: number;
    statusChangedById?: string;
};

export type AppointmentUpdateData = {
    startTime?: Date;
    serviceId?: string;
    staffId?: string;
    notes?: string;
    cancellationReason?: string;
};

export type AppointmentStatusUpdate = {
    expectedStatus: AppointmentStatus;
    status: AppointmentStatus;
    reason?: string;
    actorId?: string;
    cancellationReason?: string;
    qualifyLoyalty?: true;
};

export type AppointmentFilters = {
    userId?: string;
    staffId?: string;
    serviceId?: string;
    status?: AppointmentStatus;
    startDate?: Date;
    endDate?: Date;
};

export type AppointmentReviewCandidate = {
    id: string;
    tenantId: string;
    status: AppointmentStatus;
    endTime: Date;
    tenantTimezone: string | null;
};

export type AppointmentReviewCandidateQuery = {
    /**
     * Optional lower bound on which appointments the sweep may look at. null
     * means no lower bound, which is the default, leaving the two-hour grace as
     * the only temporal rule. See resolveAppointmentReviewActivationCutoff for
     * why this cannot default to a rolling value.
     */
    activationCutoff: Date | null;
    eligibleThrough: Date;
    limit: number;
};

/**
 * Appointment Repository Interface
 * Defines operations for Appointment persistence
 */
export interface IAppointmentRepository {
    create(tenantId: string, data: AppointmentCreateData): Promise<Appointment>;
    findById(
        tenantId: string,
        id: string,
        includeRelations?: boolean,
    ): Promise<Appointment | null>;
    findAll(
        tenantId: string | undefined,
        filters?: AppointmentFilters,
    ): Promise<Appointment[]>;
    findAllPaginated(
        tenantId: string | undefined,
        filters: AppointmentFilters | undefined,
        page: number,
        limit: number,
    ): Promise<{ appointments: Appointment[]; total: number }>;
    findByUser(tenantId: string, userId: string): Promise<Appointment[]>;
    findByStaff(
        tenantId: string,
        staffId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<Appointment[]>;
    update(
        tenantId: string,
        id: string,
        data: AppointmentUpdateData,
    ): Promise<Appointment>;
    updateStatus(
        tenantId: string,
        id: string,
        data: AppointmentStatusUpdate,
    ): Promise<Appointment | null>;
    findReviewCandidates(
        query: AppointmentReviewCandidateQuery,
    ): Promise<AppointmentReviewCandidate[]>;
    /** Internal maintenance transition; public status mutations must not call this. */
    markNeedsReview(
        tenantId: string,
        id: string,
        expectedStatus: AppointmentStatus,
        activationCutoff: Date | null,
        eligibleThrough: Date,
        changedAt: Date,
        reason: string,
    ): Promise<boolean>;
    delete(tenantId: string, id: string): Promise<void>;

    // Availability checking
    checkAvailability(
        tenantId: string,
        staffId: string,
        startTime: Date,
        endTime: Date,
        excludeAppointmentId?: string,
    ): Promise<boolean>;
}
