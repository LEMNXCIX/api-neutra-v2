import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { AppointmentStatus } from '@/core/entities/appointment.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { AppointmentNotificationService } from '@/infrastructure/services/appointment-notification.service';

export class UpdateAppointmentStatusUseCase {
    private notificationService: AppointmentNotificationService;

    constructor(
        private appointmentRepository: IAppointmentRepository,
        private logger: ILogger
    ) {
        this.notificationService = new AppointmentNotificationService(appointmentRepository, logger);
    }

    async execute(tenantId: string, id: string, status: AppointmentStatus) {
        try {
            // 1. Update status
            const appointment = await this.appointmentRepository.updateStatus(tenantId, id, status);

            if (!appointment) {
                return {
                    success: false,
                    code: 404,
                    message: 'Appointment not found',
                };
            }

            this.logger.info('Appointment status updated', { appointmentId: id, status });

            // 2. If confirmed, send email with ICS
            if (status === AppointmentStatus.CONFIRMED) {
                this.notificationService.sendConfirmationEmail(tenantId, id).catch(err => {
                    this.logger.error('Failed to send confirmation email', {
                        appointmentId: id,
                        error: err.message
                    });
                });
            }

            return {
                success: true,
                code: 200,
                message: `Appointment status updated to ${status}`,
                data: appointment,
            };
        } catch (error: any) {
            this.logger.error('Error in UpdateAppointmentStatusUseCase', {
                appointmentId: id,
                error: error.message
            });
            return {
                success: false,
                code: 500,
                message: 'Error updating appointment status',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
