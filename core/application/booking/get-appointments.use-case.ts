import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { AppointmentFilters } from '@/core/entities/appointment.entity';
import { ILogger } from '@/core/providers/logger.interface';

export class GetAppointmentsUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string | undefined, filters?: AppointmentFilters) {
        try {
            const appointments = await this.appointmentRepository.findAll(tenantId, filters);

            this.logger.info('Appointments retrieved successfully', { count: appointments.length });

            return {
                success: true,
                code: 200,
                message: 'Appointments retrieved successfully',
                data: appointments,
            };
        } catch (error: any) {
            this.logger.error('Error retrieving appointments', { error: error.message });
            return {
                success: false,
                code: 500,
                message: 'Error retrieving appointments',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message,
                }],
            };
        }
    }
}
