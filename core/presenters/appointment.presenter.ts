import {
    AppointmentResponse,
    IAppointmentResponse,
} from "@/core/application/dtos/responses/appointment/appointment.response";
import {
    AppointmentListResponse,
    IAppointmentListResponse,
} from "@/core/application/dtos/responses/appointment/appointment-list.response";
import { Appointment } from "@/core/entities/appointment.entity";

export class AppointmentPresenter {
    static toResponse(appointment: Appointment): IAppointmentResponse {
        return AppointmentResponse.fromEntity(appointment);
    }

    static toResponseList(
        appointments: Appointment[],
    ): IAppointmentListResponse[] {
        return appointments.map((a) => AppointmentListResponse.fromEntity(a));
    }
}
