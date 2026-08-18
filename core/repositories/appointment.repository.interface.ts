import {
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
};

export type AppointmentUpdateData = {
    startTime?: Date;
    serviceId?: string;
    staffId?: string;
    status?: AppointmentStatus;
    notes?: string;
    cancellationReason?: string;
};

export type AppointmentFilters = {
    userId?: string;
    staffId?: string;
    serviceId?: string;
    status?: AppointmentStatus;
    startDate?: Date;
    endDate?: Date;
};

/**
 * Appointment Repository Interface
 * Defines operations for Appointment persistence
 */
export interface IAppointmentRepository {
    create(
        tenantId: string,
        data: AppointmentCreateData,
    ): Promise<Appointment>;
    findById(
        tenantId: string,
        id: string,
        includeRelations?: boolean,
    ): Promise<Appointment | null>;
    findAll(
        tenantId: string | undefined,
        filters?: AppointmentFilters,
    ): Promise<Appointment[]>;
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
        status: AppointmentStatus,
    ): Promise<Appointment>;
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
