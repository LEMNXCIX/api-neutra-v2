import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class DeleteAppointmentUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const appointment = await this.appointmentRepository.findById(tenantId, id);

        if (!appointment) {
            throw new AppError("Appointment not found", 404, ResourceErrorCodes.NOT_FOUND);
        }

        await this.appointmentRepository.delete(tenantId, id);

        this.logger.info(`Appointment deleted successfully: ${id}`, { tenantId, appointmentId: id });

        return Success(null, "Appointment deleted successfully");
    }
}
