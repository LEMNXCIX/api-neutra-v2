import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export interface GetAvailabilityDTO {
    staffId: string;
    serviceId: string;
    date: string; // ISO Date string (YYYY-MM-DD or full ISO)
    timezoneOffset?: string; // Client timezone offset in minutes (UTC - Local)
}

export class GetAvailabilityUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private staffRepository: IStaffRepository,
        private serviceRepository: IServiceRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, data: GetAvailabilityDTO) {
        try {
            // 1. Get Service to know duration
            const service = await this.serviceRepository.findById(tenantId, data.serviceId);
            if (!service) {
                return {
                    code: 404,
                    success: false,
                    message: 'Service not found',
                };
            }

            // 2. Get Staff to know working hours (default 9-17 if not set)
            const staff = await this.staffRepository.findById(tenantId, data.staffId);
            if (!staff) {
                return {
                    code: 404,
                    success: false,
                    message: 'Staff not found',
                };
            }

            // Default working hours 09:00 - 17:00 if not specified
            const workStartHour = 9;
            const workEndHour = 17;

            // 3. Get existing appointments for the date
            const targetDate = new Date(data.date);
            if (isNaN(targetDate.getTime())) {
                return { code: 400, success: false, message: 'Invalid Date' };
            }

            // Fetch generic range (wider range to be safe with timezones, usually +/- 24h)
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            startOfDay.setDate(startOfDay.getDate() - 1); // -1 day buffer

            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            endOfDay.setDate(endOfDay.getDate() + 1); // +1 day buffer

            const appointments = await this.appointmentRepository.findByStaff(
                tenantId,
                data.staffId,
                startOfDay,
                endOfDay
            );

            // Filter active appointments
            const activeAppointments = appointments.filter(
                a => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW'
            );

            console.log(`[Avail] Debug Start. Offset=${data.timezoneOffset}. ActiveApps=${activeAppointments.length}`);
            activeAppointments.forEach(a => console.log(`[Avail] App: ${a.id} ${a.status} ${a.startTime.toISOString()} - ${a.endTime.toISOString()}`));

            // 4. Generate slots in generic terms (09:00, 09:30...)
            const availableSlots: string[] = [];
            const interval = 30; // minutes
            const offset = data.timezoneOffset ? Number(data.timezoneOffset) : 0;

            // Iterate through the day in 30 min intervals
            const currentSlot = new Date(targetDate);
            currentSlot.setHours(workStartHour, 0, 0, 0);

            const endWorkTime = new Date(targetDate);
            endWorkTime.setHours(workEndHour, 0, 0, 0);

            while (currentSlot < endWorkTime) {
                // Calculate Slot Start/End in UTC (adjusted by client offset)
                // SlotGeneric is "09:00" (Node UTC). Treat as "09:00 Client Time".
                // UTC = Client + Offset

                const slotGeneric = new Date(currentSlot);
                const slotStartUTC = new Date(slotGeneric.getTime() + offset * 60000);
                const slotEndUTC = new Date(slotStartUTC.getTime() + service.duration * 60000); // Duration in ms

                // Skip slots in the past
                const now = new Date();
                if (slotStartUTC < now) {
                    currentSlot.setMinutes(currentSlot.getMinutes() + interval);
                    continue;
                }

                // Ensure slot fits within working hours (Local Check)
                const slotEndLocal = new Date(slotGeneric.getTime() + service.duration * 60000);

                if (slotEndLocal <= endWorkTime) {
                    // Check for conflicts using UTC times
                    const hasConflict = activeAppointments.some(app => {
                        const appStart = new Date(app.startTime);
                        const appEnd = new Date(app.endTime);
                        // Overlap condition: (StartA < EndB) and (EndA > StartB)
                        const overlap = (slotStartUTC < appEnd && slotEndUTC > appStart);
                        if (overlap) {
                            console.log(`[Avail] Conflict! Slot ${slotStartUTC.toISOString()} overlaps App ${appStart.toISOString()}`);
                        }
                        return overlap;
                    });

                    if (!hasConflict) {
                        const hours = slotGeneric.getHours().toString().padStart(2, '0');
                        const minutes = slotGeneric.getMinutes().toString().padStart(2, '0');
                        availableSlots.push(`${hours}:${minutes}`);
                    }
                }

                // Advance to next interval
                currentSlot.setMinutes(currentSlot.getMinutes() + interval);
            }

            return {
                code: 200,
                success: true,
                data: availableSlots,
            };

        } catch (error: any) {
            this.logger.error('Error checking availability', { error: error.message });
            console.error('Error checking availability', error);
            return {
                code: 500,
                success: false,
                message: 'Error checking availability',
            };
        }
    }
}
