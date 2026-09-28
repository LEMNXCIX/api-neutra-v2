import type { ValidateCouponUseCase } from "@/core/application/coupons/validate-coupon.use-case";
import type { CreateAppointmentDTO } from "@/core/application/dtos/requests/appointment.request";
import {
    fitsInRanges,
    getDayRanges,
    hasWorkingHoursSchedule,
    intersectRanges,
    isDayClosed,
    isHoliday,
} from "@/core/domain/booking/working-hours";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    InvalidStateError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import type { IQueueProvider } from "@/core/providers/queue-provider.interface";
import type {
    AppointmentCreateData,
    IAppointmentRepository,
} from "@/core/repositories/appointment.repository.interface";
import type { ICouponRepository } from "@/core/repositories/coupon.repository.interface";
import type { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import type { IServiceRepository } from "@/core/repositories/service.repository.interface";
import type { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";
import { BusinessErrorCodes } from "@/types/error-codes";

export class CreateAppointmentUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private staffRepository: IStaffRepository,
        private serviceRepository: IServiceRepository,
        private couponRepository: ICouponRepository,
        private validateCouponUseCase: ValidateCouponUseCase,
        private queueProvider: IQueueProvider,
        private featureRepository: IFeatureRepository,
        private tenantRepository?: ITenantRepository,
    ) {}

    async execute(
        tenantId: string,
        data: CreateAppointmentDTO,
        origin?: string,
        actorId?: string,
    ): Promise<UseCaseResult> {
        if (
            !data.userId ||
            !data.serviceId ||
            !data.staffId ||
            !data.startTime
        ) {
            throw new ValidationError("Missing required fields");
        }

        const service = await this.serviceRepository.findById(
            tenantId,
            data.serviceId,
        );
        if (!service?.active) {
            throw new EntityNotFoundError("Service", data.serviceId);
        }

        const staff = await this.staffRepository.findById(
            tenantId,
            data.staffId,
        );
        if (!staff?.active) {
            throw new EntityNotFoundError("Staff", data.staffId);
        }

        const staffServices = await this.staffRepository.getServices(
            tenantId,
            data.staffId,
        );
        if (!staffServices.includes(data.serviceId)) {
            throw new BusinessRuleViolationError(
                "This staff member is not authorized to perform the selected service",
            );
        }

        const startTime = new Date(data.startTime);
        if (startTime.getTime() <= Date.now()) {
            throw new BusinessRuleViolationError(
                "The appointment start time must be in the future",
                BusinessErrorCodes.START_TIME_NOT_IN_FUTURE,
            );
        }

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + service.duration);

        // Schedule validation (optional dep so existing wiring/tests keep working)
        if (this.tenantRepository) {
            const tenant = await this.tenantRepository.findById(tenantId);
            const settings = tenant?.config?.settings;
            if (isHoliday(settings?.holidays, startTime)) {
                throw new BusinessRuleViolationError(
                    "The selected date is a holiday",
                    BusinessErrorCodes.HOLIDAY_CLOSED,
                );
            }
            const staffSchedule = staff.workingHours;
            const tenantSchedule = settings?.businessHours;
            if (
                isDayClosed(tenantSchedule, startTime) ||
                isDayClosed(staffSchedule, startTime)
            ) {
                throw new BusinessRuleViolationError(
                    "The selected time is outside working hours",
                    BusinessErrorCodes.OUTSIDE_WORKING_HOURS,
                );
            }
            const ranges = intersectRanges(
                getDayRanges(staffSchedule, startTime),
                getDayRanges(tenantSchedule, startTime),
            );
            const hasSchedule =
                hasWorkingHoursSchedule(staffSchedule) ||
                hasWorkingHoursSchedule(tenantSchedule);
            if (
                hasSchedule &&
                !fitsInRanges(
                    startTime.getHours() * 60 + startTime.getMinutes(),
                    endTime.getHours() * 60 + endTime.getMinutes(),
                    ranges,
                )
            ) {
                throw new BusinessRuleViolationError(
                    "The selected time is outside working hours",
                    BusinessErrorCodes.OUTSIDE_WORKING_HOURS,
                );
            }
        }

        const isAvailable = await this.appointmentRepository.checkAvailability(
            tenantId,
            data.staffId,
            startTime,
            endTime,
        );

        if (!isAvailable) {
            throw new InvalidStateError(
                "The selected time slot is already booked",
            );
        }

        let couponId: string | undefined;
        let discountAmount = 0;
        const subtotal = service.price;
        let total = service.price;

        if (data.couponCode) {
            const validationResult = await this.validateCouponUseCase.execute(
                tenantId,
                {
                    code: data.couponCode,
                    orderTotal: service.price,
                    serviceIds: [service.id],
                },
                data.userId,
            );

            if (!validationResult.success || !validationResult.data?.valid) {
                throw new BusinessRuleViolationError(
                    validationResult.message ||
                        "The provided coupon is invalid",
                    BusinessErrorCodes.INVALID_COUPON,
                );
            }

            couponId = validationResult.data.coupon!.id;
            discountAmount = validationResult.data.discountAmount || 0;
            total = subtotal - discountAmount;
            if (total < 0) total = 0;
        }

        const baseData: AppointmentCreateData = { ...data };
        const appointmentData = {
            ...baseData,
            statusChangedById: actorId ?? data.userId,
            couponId,
            discountAmount,
            subtotal,
            total,
        };

        const appointment = await this.appointmentRepository.create(
            tenantId,
            appointmentData,
        );

        const features =
            await this.featureRepository.getTenantFeatureStatus(tenantId);
        if (features.EMAIL_NOTIFICATIONS) {
            await this.queueProvider.enqueue("notifications", {
                type: "PENDING_APPROVAL",
                appointmentId: appointment.id,
                tenantId: tenantId,
                origin: origin,
            });
        }

        return Success(
            appointment,
            "Appointment created successfully. Awaiting staff approval.",
        );
    }
}
