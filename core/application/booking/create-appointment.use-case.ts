import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { IStaffRepository } from '@/core/repositories/staff.repository.interface';
import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { CreateAppointmentDTO } from '@/core/entities/appointment.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { ValidationErrorCodes, BusinessErrorCodes } from '@/types/error-codes';
import { emailService } from '@/infrastructure/services/email.service';

export class CreateAppointmentUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private staffRepository: IStaffRepository,
        private serviceRepository: IServiceRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, data: CreateAppointmentDTO) {
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

            // Create appointment
            const appointment = await this.appointmentRepository.create(tenantId, data);

            this.logger.info('Appointment created successfully', { appointmentId: appointment.id });

            // Send confirmation email (async, non-blocking)
            this.sendConfirmationEmail(appointment).catch(err => {
                this.logger.error('Failed to send appointment confirmation email', {
                    appointmentId: appointment.id,
                    error: err.message
                });
            });

            return {
                success: true,
                code: 201,
                message: 'Appointment created successfully',
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

    private async sendConfirmationEmail(appointment: any): Promise<void> {
        // TODO: Fetch user email and send confirmation
        // Implementation will be added when email templates are created
        this.logger.info('Appointment confirmation email queued', { appointmentId: appointment.id });
    }
}
