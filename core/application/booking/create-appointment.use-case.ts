import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { CreateAppointmentDTO } from '@/core/entities/appointment.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { IQueueProvider } from '@/core/providers/queue-provider.interface';
import { ValidationErrorCodes, BusinessErrorCodes } from '@/types/error-codes';
import { ValidateCouponUseCase } from '@/core/application/coupons/validate-coupon.use-case';
import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';

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

    async execute(tenantId: string, data: CreateAppointmentDTO, origin?: string) {
        // Validation
        if (!data.userId || !data.serviceId || !data.staffId || !data.startTime) {
            this.logger.warn('CreateAppointment failed: missing required fields', { data });
            return {
                success: false,
                code: 400,
                message: 'Missing required fields',
                errors: [{
                    code: ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
                    message: 'User, service, staff, and start time are required',
                }],
            };
        }

        try {
            // Verify service exists and is active
            const service = await this.serviceRepository.findById(tenantId, data.serviceId);
            if (!service || !service.active) {
                return {
                    success: false,
                    code: 404,
                    message: 'Service not found or inactive',
                    errors: [{
                        code: BusinessErrorCodes.RESOURCE_NOT_FOUND,
                        message: 'The selected service is not available',
                    }],
                };
            }

            // Verify staff exists and is active
            const staff = await this.staffRepository.findById(tenantId, data.staffId);
            if (!staff || !staff.active) {
                return {
                    success: false,
                    code: 404,
                    message: 'Staff member not found or inactive',
                    errors: [{
                        code: BusinessErrorCodes.RESOURCE_NOT_FOUND,
                        message: 'The selected staff member is not available',
                    }],
                };
            }

            // Verify staff can perform this service
            const staffServices = await this.staffRepository.getServices(tenantId, data.staffId);
            if (!staffServices.includes(data.serviceId)) {
                return {
                    success: false,
                    code: 400,
                    message: 'Staff cannot perform this service',
                    errors: [{
                        code: BusinessErrorCodes.BUSINESS_RULE_VIOLATION,
                        message: 'This staff member is not authorized to perform the selected service',
                    }],
                };
            }

            // Calculate end time
            const startTime = new Date(data.startTime);
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + service.duration);

            // Check availability (no double booking)
            const isAvailable = await this.appointmentRepository.checkAvailability(
                tenantId,
                data.staffId,
                startTime,
                endTime
            );

            if (!isAvailable) {
                return {
                    success: false,
                    code: 409,
                    message: 'Time slot not available',
                    errors: [{
                        code: BusinessErrorCodes.RESOURCE_CONFLICT,
                        message: 'The selected time slot is already booked',
                    }],
                };
            }

            // Coupon Logic
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
                    return {
                        success: false,
                        code: 400,
                        message: validationResult.message || 'Invalid coupon',
                        errors: [{
                            code: 'INVALID_COUPON',
                            message: validationResult.message || 'The provided coupon is invalid',
                        }],
                    };
                }

                couponId = validationResult.coupon!.id;
                discountAmount = validationResult.discountAmount || 0;
                total = subtotal - discountAmount;
                if (total < 0) total = 0;

                await this.couponRepository.incrementUsage(tenantId, couponId);
            }

            // Create appointment
            // We need to pass the calculated values
            // data doesn't have these fields, we need to extend what we pass to repo
            const appointmentData = {
                ...data,
                couponId,
                discountAmount,
                subtotal,
                total
            };

            const appointment = await this.appointmentRepository.create(tenantId, appointmentData);

            this.logger.info('Appointment created successfully', { appointmentId: appointment.id });

            // 2. Check if EMAIL_NOTIFICATIONS feature is enabled
            const features = await this.featureRepository.getTenantFeatureStatus(tenantId);
            if (features['EMAIL_NOTIFICATIONS']) {
                // Enqueue notification job to notify STAFF (not user) about pending appointment
                // User will be notified when staff approves/rejects
                await this.queueProvider.enqueue('notifications', {
                    type: 'PENDING_APPROVAL',
                    appointmentId: appointment.id,
                    tenantId: tenantId,
                    origin: origin // Pass origin for correct links in email
                });
            } else {
                this.logger.info('Skipping email notification: EMAIL_NOTIFICATIONS feature disabled', { tenantId });
            }

            return {
                success: true,
                code: 201,
                message: 'Appointment created successfully. Awaiting staff approval.',
                data: appointment,
            };
        } catch (error: any) {
            this.logger.error('Error creating appointment', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error creating appointment',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
