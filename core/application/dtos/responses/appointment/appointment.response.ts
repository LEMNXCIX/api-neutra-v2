import {
    Appointment,
    AppointmentStatus,
} from "@/core/entities/appointment.entity";
import { IUserMinimalResponse } from "../shared/user-minimal.response";
import { IStaffMinimalResponse } from "../shared/staff-minimal.response";
import { IServiceMinimalResponse } from "../shared/service-minimal.response";
import { UserMinimalResponse } from "../shared/user-minimal.response";
import { StaffMinimalResponse } from "../shared/staff-minimal.response";
import { ServiceMinimalResponse } from "../shared/service-minimal.response";

export interface IAppointmentResponse {
    id: string;
    startTime: Date;
    endTime: Date;
    status: AppointmentStatus;
    notes?: string;
    cancellationReason?: string | null;
    discountAmount: number;
    subtotal: number;
    total: number;
    createdAt: Date;
    updatedAt: Date;
    user?: IUserMinimalResponse;
    staff?: IStaffMinimalResponse;
    service?: IServiceMinimalResponse;
}

export class AppointmentResponse {
    static fromEntity(appointment: Appointment): IAppointmentResponse {
        return {
            id: appointment.id,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status,
            notes: appointment.notes,
            cancellationReason: appointment.cancellationReason ?? null,
            discountAmount: appointment.discountAmount ?? 0,
            subtotal: appointment.subtotal ?? 0,
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
        };
    }
}
