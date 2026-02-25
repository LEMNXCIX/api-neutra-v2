import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { AppointmentStatus } from '@/core/entities/appointment.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { IQueueProvider } from '@/core/providers/queue-provider.interface';
import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class UpdateAppointmentStatusUseCase {

    constructor(
        private appointmentRepository: IAppointmentRepository,
        private logger: ILogger,
        private queueProvider: IQueueProvider,
        private featureRepository: IFeatureRepository
    ) { }

    async execute(tenantId: string, id: string, status: AppointmentStatus, origin?: string): Promise<UseCaseResult> {
        const appointment = await this.appointmentRepository.updateStatus(tenantId, id, status);

        if (!appointment) {
            throw new AppError('Appointment not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        this.logger.info('Appointment status updated', { appointmentId: id, status });

        const features = await this.featureRepository.getTenantFeatureStatus(tenantId);
        const emailEnabled = features['EMAIL_NOTIFICATIONS'];

        if (emailEnabled) {
            if (status === AppointmentStatus.CONFIRMED) {
                await this.queueProvider.enqueue('notifications', {
                    type: 'CONFIRMED',
                    appointmentId: id,
                    tenantId: tenantId,
                    origin: origin
                });
            } else if (status === AppointmentStatus.CANCELLED) {
                await this.queueProvider.enqueue('notifications', {
                    type: 'CANCELLED',
                    appointmentId: id,
                    tenantId: tenantId,
                    origin: origin
                });
            }
        }

        return Success(appointment, `Appointment status updated to ${status}`);
    }
}
