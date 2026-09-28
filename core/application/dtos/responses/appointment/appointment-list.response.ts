import type {
    Appointment,
    AppointmentStatus,
} from "@/core/entities/appointment.entity";
import {
    type IServiceMinimalResponse,
    ServiceMinimalResponse,
} from "../shared/service-minimal.response";
import {
    type IStaffMinimalResponse,
    StaffMinimalResponse,
} from "../shared/staff-minimal.response";
import {
    type ITenantMinimalResponse,
    TenantMinimalResponse,
} from "../shared/tenant-minimal.response";
import {
    type IUserMinimalResponse,
    UserMinimalResponse,
} from "../shared/user-minimal.response";

export interface IAppointmentListResponse {
    id: string;
    userId: string;
    startTime: Date;
    endTime: Date;
    status: AppointmentStatus;
    statusChangedAt?: Date | null;
    statusChangeReason?: string | null;
    statusChangedById?: string | null;
    notes?: string | null;
    total: number;
    createdAt: Date;
    updatedAt: Date;
    user?: IUserMinimalResponse;
    staff?: IStaffMinimalResponse;
    service?: IServiceMinimalResponse;
    tenant?: ITenantMinimalResponse;
}

export class AppointmentListResponse {
    static fromEntity(appointment: Appointment): IAppointmentListResponse {
        return {
            id: appointment.id,
            userId: appointment.userId,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status,
            statusChangedAt: appointment.statusChangedAt ?? null,
            statusChangeReason: appointment.statusChangeReason ?? null,
            statusChangedById: appointment.statusChangedById ?? null,
            notes: appointment.notes,
            total: appointment.total ?? 0,
            createdAt: appointment.createdAt,
            updatedAt: appointment.updatedAt,
            user: appointment.user
                ? UserMinimalResponse.fromEntity(appointment.user)
                : undefined,
            staff: appointment.staff
                ? StaffMinimalResponse.fromEntity(appointment.staff)
                : undefined,
            service: appointment.service
                ? ServiceMinimalResponse.fromEntity(appointment.service)
                : undefined,
            tenant: appointment.tenant
                ? TenantMinimalResponse.fromEntity(appointment.tenant)
                : undefined,
        };
    }
}
