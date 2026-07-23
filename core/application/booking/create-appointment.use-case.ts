import {
    IAppointmentRepository,
    AppointmentCreateData,
} from "@/core/repositories/appointment.repository.interface";
import { IStaffRepository } from "@/core/repositories/staff.repository.interface";
import { IServiceRepository } from "@/core/repositories/service.repository.interface";
import { ICouponRepository } from "@/core/repositories/coupon.repository.interface";
import { CreateAppointmentDTO } from "@/core/application/dtos/requests/appointment.request";
import { IQueueProvider } from "@/core/providers/queue-provider.interface";
import { ValidateCouponUseCase } from "@/core/application/coupons/validate-coupon.use-case";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    BusinessRuleViolationError,
    InvalidStateError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";

export class CreateAppointmentUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private staffRepository: IStaffRepository,
        private serviceRepository: IServiceRepository,
        private couponRepository: ICouponRepository,
        private validateCouponUseCase: ValidateCouponUseCase,
        private queueProvider: IQueueProvider,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(
        tenantId: string,
        data: CreateAppointmentDTO,
        origin?: string,
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
        if (!service || !service.active) {
            throw new EntityNotFoundError("Service", data.serviceId);
        }

        const staff = await this.staffRepository.findById(
            tenantId,
            data.staffId,
        );
        if (!staff || !staff.active) {
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
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + service.duration);

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

        let couponId = undefined;
        let discountAmount = 0;
        let subtotal = service.price;
        let total = service.price;

        if (data.couponCode) {
            const validationResult = await this.validateCouponUseCase.execute(
                tenantId,
                {
                    code: data.couponCode,
                    orderTotal: service.price,
                    serviceIds: [service.id],
                },
            );

            if (!validationResult.success || !validationResult.data?.valid) {
                throw new BusinessRuleViolationError(
                    validationResult.message ||
                        "The provided coupon is invalid",
                    "INVALID_COUPON",
                );
            }

            couponId = validationResult.data.coupon!.id;
            discountAmount = validationResult.data.discountAmount || 0;
            total = subtotal - discountAmount;
            if (total < 0) total = 0;

            await this.couponRepository.incrementUsage(tenantId, couponId);
        }

        const baseData: AppointmentCreateData = { ...data };
        const appointmentData = {
            ...baseData,
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
        if (features["EMAIL_NOTIFICATIONS"]) {
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
