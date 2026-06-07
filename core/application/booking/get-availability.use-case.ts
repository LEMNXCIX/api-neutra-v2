import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { IServiceRepository } from "@/core/repositories/service.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { GetAvailabilityDTO } from "@/core/application/dtos/requests/appointment.request";

export class GetAvailabilityUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private staffRepository: IStaffRepository,
        private serviceRepository: IServiceRepository,
    ) {}

    async execute(
        tenantId: string,
        data: GetAvailabilityDTO,
    ): Promise<UseCaseResult> {
        if (!data.staffId || !data.serviceId || !data.date) {
            throw new ValidationError(
                "Missing required parameters: staffId, serviceId, date",
            );
        }
        const service = await this.serviceRepository.findById(
            tenantId,
            data.serviceId,
        );
        if (!service) {
            throw new EntityNotFoundError("Service", data.serviceId);
        }

        const staff = await this.staffRepository.findById(
            tenantId,
            data.staffId,
        );
        if (!staff) {
            throw new EntityNotFoundError("Staff", data.staffId);
        }

        const workStartHour = 9;
        const workEndHour = 17;

        const targetDate = new Date(data.date);
        if (isNaN(targetDate.getTime())) {
            throw new ValidationError("Invalid Date");
        }

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        startOfDay.setDate(startOfDay.getDate() - 1);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const appointments = await this.appointmentRepository.findByStaff(
            tenantId,
            data.staffId,
            startOfDay,
            endOfDay,
        );

        const activeAppointments = appointments.filter(
            (a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW",
        );

        const availableSlots: string[] = [];
        const interval = 30;
        const offset = data.timezoneOffset ? Number(data.timezoneOffset) : 0;

        const currentSlot = new Date(targetDate);
        currentSlot.setHours(workStartHour, 0, 0, 0);

        const endWorkTime = new Date(targetDate);
        endWorkTime.setHours(workEndHour, 0, 0, 0);

        while (currentSlot < endWorkTime) {
            const slotGeneric = new Date(currentSlot);
            const slotStartUTC = new Date(
                slotGeneric.getTime() + offset * 60000,
            );
            const slotEndUTC = new Date(
                slotStartUTC.getTime() + service.duration * 60000,
            );

            const now = new Date();
            if (slotStartUTC < now) {
                currentSlot.setMinutes(currentSlot.getMinutes() + interval);
                continue;
            }

            const slotEndLocal = new Date(
                slotGeneric.getTime() + service.duration * 60000,
            );

            if (slotEndLocal <= endWorkTime) {
                const hasConflict = activeAppointments.some((app) => {
                    const appStart = new Date(app.startTime);
                    const appEnd = new Date(app.endTime);
                    const overlap =
                        slotStartUTC < appEnd && slotEndUTC > appStart;
                    return overlap;
                });

                if (!hasConflict) {
                    const hours = slotGeneric
                        .getHours()
                        .toString()
                        .padStart(2, "0");
                    const minutes = slotGeneric
                        .getMinutes()
                        .toString()
                        .padStart(2, "0");
                    availableSlots.push(`${hours}:${minutes}`);
                }
            }

            currentSlot.setMinutes(currentSlot.getMinutes() + interval);
        }

        return Success(availableSlots);
    }
}
