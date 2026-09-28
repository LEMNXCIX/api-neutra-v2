import type { GetAvailabilityDTO } from "@/core/application/dtos/requests/appointment.request";
import {
    fitsInRanges,
    getDayRanges,
    hasWorkingHoursSchedule,
    intersectRanges,
    isDayClosed,
    isHoliday,
    type TimeRange,
    toMinutes,
} from "@/core/domain/booking/working-hours";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import type { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import type { IServiceRepository } from "@/core/repositories/service.repository.interface";
import type { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetAvailabilityUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private staffRepository: IStaffRepository,
        private serviceRepository: IServiceRepository,
        private tenantRepository: ITenantRepository,
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

        const dateParts = /^(\d{4})-(\d{2})-(\d{2})(?=$|T|\s)/
            .exec(data.date)
            ?.slice(1)
            .map(Number);
        if (!dateParts) {
            throw new ValidationError("Invalid Date");
        }

        const [calendarYear, calendarMonth, calendarDay] = dateParts;
        const targetDate = new Date(
            calendarYear,
            calendarMonth - 1,
            calendarDay,
            12,
        );
        if (
            targetDate.getFullYear() !== calendarYear ||
            targetDate.getMonth() !== calendarMonth - 1 ||
            targetDate.getDate() !== calendarDay
        ) {
            throw new ValidationError("Invalid Date");
        }

        const tenant = await this.tenantRepository.findById(tenantId);
        const settings = tenant?.config?.settings;
        if (isHoliday(settings?.holidays, targetDate)) {
            return Success([]);
        }

        const staffSchedule = staff.workingHours;
        const tenantSchedule = settings?.businessHours;
        if (
            isDayClosed(tenantSchedule, targetDate) ||
            isDayClosed(staffSchedule, targetDate)
        ) {
            return Success([]);
        }

        const staffRanges = getDayRanges(staffSchedule, targetDate);
        const tenantRanges = getDayRanges(tenantSchedule, targetDate);
        const ranges = intersectRanges(staffRanges, tenantRanges);
        const hasSchedule =
            hasWorkingHoursSchedule(staffSchedule) ||
            hasWorkingHoursSchedule(tenantSchedule);
        if (hasSchedule && !ranges.length) {
            return Success([]);
        }

        // Legacy fallback: no schedule defined anywhere → 9:00-17:00
        const workRanges: TimeRange[] = ranges.length
            ? ranges
            : [{ start: "09:00", end: "17:00" }];

        const offset = data.timezoneOffset ? Number(data.timezoneOffset) : 0;
        const wallClockToInstant = (minutes: number) =>
            Date.UTC(
                calendarYear,
                calendarMonth - 1,
                calendarDay,
                Math.floor(minutes / 60),
                minutes % 60,
            ) +
            offset * 60_000;

        const startOfDay = new Date(
            wallClockToInstant(0) - 24 * 60 * 60 * 1000,
        );
        const endOfDay = new Date(
            wallClockToInstant(24 * 60) + 24 * 60 * 60 * 1000,
        );

        const appointments = await this.appointmentRepository.findByStaff(
            tenantId,
            data.staffId,
            startOfDay,
            endOfDay,
        );

        const activeAppointments = appointments.filter(
            (a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW",
        );

        const interval = 30;
        const availableSlots: string[] = [];

        const openFrom = Math.min(...workRanges.map((r) => toMinutes(r.start)));
        const openTo = Math.max(...workRanges.map((r) => toMinutes(r.end)));
        const now = new Date();

        for (
            let slotStartMin = openFrom;
            slotStartMin < openTo;
            slotStartMin += interval
        ) {
            const slotEndMin = slotStartMin + service.duration;
            // Date.getTimezoneOffset is UTC - local minutes, so add it.
            const slotStart = new Date(wallClockToInstant(slotStartMin));
            const slotEnd = new Date(
                slotStart.getTime() + service.duration * 60_000,
            );

            if (slotStart <= now) {
                continue;
            }

            if (
                fitsInRanges(slotStartMin, slotEndMin, workRanges) &&
                !activeAppointments.some((app) => {
                    const appStart = new Date(app.startTime);
                    const appEnd = new Date(app.endTime);
                    return slotStart < appEnd && slotEnd > appStart;
                })
            ) {
                const hours = Math.floor(slotStartMin / 60)
                    .toString()
                    .padStart(2, "0");
                const minutes = (slotStartMin % 60).toString().padStart(2, "0");
                availableSlots.push(`${hours}:${minutes}`);
            }
        }

        return Success(availableSlots);
    }
}
