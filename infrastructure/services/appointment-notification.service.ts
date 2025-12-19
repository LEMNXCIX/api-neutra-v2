import { IAppointmentRepository } from '@/core/repositories/appointment.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { emailService } from '@/infrastructure/services/email.service';
import { generateAppointmentIcs } from '@/core/utils/ics-generator.util';

export class AppointmentNotificationService {
    constructor(
        private appointmentRepository: IAppointmentRepository,
        private logger: ILogger
    ) { }

    async sendConfirmationEmail(tenantId: string, appointmentId: string) {
        try {
            // Fetch full details with relations to get emails and names
            const fullAppointment = await this.appointmentRepository.findById(tenantId, appointmentId, true);

            if (!fullAppointment || !fullAppointment.user || !fullAppointment.user.email) {
                this.logger.warn('Cannot send confirmation email: User details missing', {
                    appointmentId
                });
                return false;
            }

            const userEmail = fullAppointment.user.email;
            const userName = fullAppointment.user.name;
            const serviceName = fullAppointment.service?.name || 'Service';
            const staffName = fullAppointment.staff?.name || 'Staff Member';
            const duration = fullAppointment.service?.duration || 30;

            // Generate ICS
            let icsContent: string | undefined;
            try {
                icsContent = await generateAppointmentIcs({
                    id: fullAppointment.id,
                    title: `${serviceName} with ${staffName}`,
                    description: `Confirmation of your ${serviceName} appointment with ${staffName}.`,
                    startTime: fullAppointment.startTime,
                    duration: duration,
                    organizer: { name: staffName, email: 'no-reply@neutra.com' }
                });
            } catch (icsError: any) {
                this.logger.error('Failed to generate ICS', {
                    appointmentId,
                    error: icsError.message
                });
            }

            const attachments = icsContent ? [{
                filename: 'appointment.ics',
                content: icsContent,
                contentType: 'text/calendar; charset=utf-8; method=REQUEST'
            }] : [];

            // Send email
            await emailService.sendAppointmentConfirmation(
                userEmail,
                {
                    id: fullAppointment.id,
                    userName,
                    serviceName,
                    staffName,
                    appointmentDate: fullAppointment.startTime.toLocaleDateString(),
                    appointmentTime: fullAppointment.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    duration,
                    notes: fullAppointment.notes,
                },
                undefined, // Use default tenant config for now
                attachments
            );

            this.logger.info('Appointment confirmation email sent', { appointmentId });
            return true;
        } catch (error: any) {
            this.logger.error('Error sending appointment confirmation email', {
                appointmentId,
                error: error.message
            });
            return false;
        }
    }
}
