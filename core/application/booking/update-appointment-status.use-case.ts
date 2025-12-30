import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { AppointmentStatus } from '@/core/entities/appointment.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { IQueueProvider } from '@/core/providers/queue-provider.interface';
import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';

export class UpdateAppointmentStatusUseCase {

    constructor(
        private appointmentRepository: IAppointmentRepository,
        private logger: ILogger,
        private queueProvider: IQueueProvider,
        private featureRepository: IFeatureRepository
    ) { }

    async execute(tenantId: string, id: string, status: AppointmentStatus, origin?: string) {
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

            // 2. Check if EMAIL_NOTIFICATIONS feature is enabled
            const features = await this.featureRepository.getTenantFeatureStatus(tenantId);
            const emailEnabled = features['EMAIL_NOTIFICATIONS'];

            if (emailEnabled) {
                // 3. Enqueue notification job to notify USER about status change
                if (status === AppointmentStatus.CONFIRMED) {
                    // Staff approved the appointment - notify user
                    await this.queueProvider.enqueue('notifications', {
                        type: 'CONFIRMED',
                        appointmentId: id,
                        tenantId: tenantId,
                        origin: origin
                    });
                } else if (status === AppointmentStatus.CANCELLED) {
                    // Staff rejected or cancelled the appointment - notify user
                    await this.queueProvider.enqueue('notifications', {
                        type: 'CANCELLED',
                        appointmentId: id,
                        tenantId: tenantId,
                        origin: origin
                    });
                }
            } else {
                this.logger.info('Skipping email notification: EMAIL_NOTIFICATIONS feature disabled', { tenantId });
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
