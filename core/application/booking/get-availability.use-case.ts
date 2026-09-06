import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { IServiceRepository } from "@/core/repositories/service.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { GetAvailabilityDTO } from "@/core/application/dtos/requests/appointment.request";
import {
    TimeRange,
    fitsInRanges,
    getDayRanges,
    intersectRanges,
    isHoliday,
    toMinutes,
} from "@/core/utils/working-hours";

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

        // ponytail: working hours are interpreted in server-local wall clock,
        // same frame as the legacy 9-17 grid; per-client TZ handling unchanged.
        // Date-only strings parse as UTC midnight → in TZ<UTC the local
        // weekday shifts a day. Noon keeps the intended calendar day.
        const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(data.date)
            ? new Date(`${data.date}T12:00:00`)
            : new Date(data.date);
        if (isNaN(targetDate.getTime())) {
            throw new ValidationError("Invalid Date");
        }

        const tenant = await this.tenantRepository.findById(tenantId);
        const settings = tenant?.config?.settings;
        if (isHoliday(settings?.holidays, targetDate)) {
            return Success([]);
        }

        const staffRanges = getDayRanges(staff.workingHours, targetDate);
        const tenantRanges = getDayRanges(settings?.businessHours, targetDate);
        const ranges = intersectRanges(staffRanges, tenantRanges);
        const hasHours = !!staff.workingHours || tenantRanges.length > 0;
        if (hasHours && !ranges.length) {
            return Success([]); // day off
        }

        // Legacy fallback: no schedule defined anywhere → 9:00-17:00
        const workRanges: TimeRange[] = ranges.length
            ? ranges
            : [{ start: "09:00", end: "17:00" }];

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

        const interval = 30;
        const offset = data.timezoneOffset ? Number(data.timezoneOffset) : 0;

        const availableSlots: string[] = [];

        const openFrom = Math.min(
            ...workRanges.map((r) => toMinutes(r.start)),
        );
        const openTo = Math.max(...workRanges.map((r) => toMinutes(r.end)));

        const currentSlot = new Date(targetDate);
        currentSlot.setHours(Math.floor(openFrom / 60), openFrom % 60, 0, 0);

        const endWorkTime = new Date(targetDate);
        endWorkTime.setHours(Math.floor(openTo / 60), openTo % 60, 0, 0);

        while (currentSlot < endWorkTime) {
            const slotGeneric = new Date(currentSlot);
            const slotStartMin =
                slotGeneric.getHours() * 60 + slotGeneric.getMinutes();
            const slotEndMin = slotStartMin + service.duration;
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

            if (
                fitsInRanges(slotStartMin, slotEndMin, workRanges) &&
                !activeAppointments.some((app) => {
                    const appStart = new Date(app.startTime);
                    const appEnd = new Date(app.endTime);
                    return slotStartUTC < appEnd && slotEndUTC > appStart;
                })
            ) {
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

            currentSlot.setMinutes(currentSlot.getMinutes() + interval);
        }

        return Success(availableSlots);
    }
}
