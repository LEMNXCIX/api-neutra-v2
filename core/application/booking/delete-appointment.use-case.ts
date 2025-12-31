import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class DeleteAppointmentUseCase {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, id: string): Promise<{ success: boolean; code: number; message?: string }> {
        try {
            const appointment = await this.appointmentRepository.findById(tenantId, id);

            if (!appointment) {
                return {
                    success: false,
                    code: 404,
                    message: "Appointment not found"
                };
            }

            await this.appointmentRepository.delete(tenantId, id);

            this.logger.info(`Appointment deleted successfully: ${id}`, { tenantId, appointmentId: id });

            return {
                success: true,
                code: 200,
                message: "Appointment deleted successfully"
            };
        } catch (error: any) {
            this.logger.error("Error deleting appointment", {
                tenantId,
                appointmentId: id,
                error: error.message
            });
            throw error;
        }
    }
}
