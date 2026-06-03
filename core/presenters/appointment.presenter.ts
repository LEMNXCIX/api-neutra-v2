import {
    AppointmentResponse,
    IAppointmentResponse,
} from "@/core/application/dtos/responses/appointment/appointment.response";
import {
    AppointmentListResponse,
    IAppointmentListResponse,
} from "@/core/application/dtos/responses/appointment/appointment-list.response";

export class AppointmentPresenter {
    static toResponse(appointment: any): IAppointmentResponse {
        return AppointmentResponse.fromEntity(appointment);
    }

    static toResponseList(appointments: any[]): IAppointmentListResponse[] {
        return appointments.map((a) => AppointmentListResponse.fromEntity(a));
    }
}
