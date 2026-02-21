import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { AppointmentFilters } from '@/core/entities/appointment.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetAppointmentsUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string | undefined, filters?: AppointmentFilters): Promise<UseCaseResult> {
        const appointments = await this.appointmentRepository.findAll(tenantId, filters);
        return Success(appointments, 'Appointments retrieved successfully');
    }
}
