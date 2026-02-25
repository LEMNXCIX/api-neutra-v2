import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { CreateAppointmentDTO } from '@/core/entities/appointment.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { IQueueProvider } from '@/core/providers/queue-provider.interface';
import { ValidationErrorCodes, BusinessErrorCodes, ResourceErrorCodes } from '@/types/error-codes';
import { ValidateCouponUseCase } from '@/core/application/coupons/validate-coupon.use-case';
import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';

export class CreateAppointmentUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private staffRepository: IStaffRepository,
        private serviceRepository: IServiceRepository,
        private couponRepository: ICouponRepository,
        private logger: ILogger,
        private queueProvider: IQueueProvider,
        private featureRepository: IFeatureRepository
    ) { }

    async execute(tenantId: string, data: CreateAppointmentDTO, origin?: string): Promise<UseCaseResult> {
        if (!data.userId || !data.serviceId || !data.staffId || !data.startTime) {
            throw new AppError('Missing required fields', 400, ValidationErrorCodes.MISSING_REQUIRED_FIELDS);
        }

        const service = await this.serviceRepository.findById(tenantId, data.serviceId);
        if (!service || !service.active) {
            throw new AppError('The selected service is not available', 404, ResourceErrorCodes.NOT_FOUND);
        }

        const staff = await this.staffRepository.findById(tenantId, data.staffId);
        if (!staff || !staff.active) {
            throw new AppError('The selected staff member is not available', 404, ResourceErrorCodes.NOT_FOUND);
        }

        const staffServices = await this.staffRepository.getServices(tenantId, data.staffId);
        if (!staffServices.includes(data.serviceId)) {
            throw new AppError('This staff member is not authorized to perform the selected service', 400, BusinessErrorCodes.BUSINESS_RULE_VIOLATION);
        }

        const startTime = new Date(data.startTime);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + service.duration);

        const isAvailable = await this.appointmentRepository.checkAvailability(
            tenantId,
            data.staffId,
            startTime,
            endTime
        );

        if (!isAvailable) {
            throw new AppError('The selected time slot is already booked', 409, BusinessErrorCodes.RESOURCE_CONFLICT);
        }

        let couponId = undefined;
        let discountAmount = 0;
        let subtotal = service.price;
        let total = service.price;

        if (data.couponCode) {
            const validateCouponUseCase = new ValidateCouponUseCase(this.couponRepository);
            const validationResult = await validateCouponUseCase.execute(tenantId, {
                code: data.couponCode,
                orderTotal: service.price,
                serviceIds: [service.id]
            });

            if (!validationResult.valid) {
                throw new AppError(validationResult.message || 'The provided coupon is invalid', 400, 'INVALID_COUPON');
            }

            couponId = validationResult.coupon!.id;
            discountAmount = validationResult.discountAmount || 0;
            total = subtotal - discountAmount;
            if (total < 0) total = 0;

            await this.couponRepository.incrementUsage(tenantId, couponId);
        }

        const appointmentData = {
            ...data,
            couponId,
            discountAmount,
            subtotal,
            total
        };

        const appointment = await this.appointmentRepository.create(tenantId, appointmentData);

        const features = await this.featureRepository.getTenantFeatureStatus(tenantId);
        if (features['EMAIL_NOTIFICATIONS']) {
            await this.queueProvider.enqueue('notifications', {
                type: 'PENDING_APPROVAL',
                appointmentId: appointment.id,
                tenantId: tenantId,
                origin: origin
            });
        }

        return Success(appointment, 'Appointment created successfully. Awaiting staff approval.');
    }
}
