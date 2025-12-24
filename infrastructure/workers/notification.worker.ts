import { Worker, Job } from 'bullmq';
import { redisOptions } from '@/infrastructure/services/queue.service';
import { PrismaAppointmentRepository } from '@/infrastructure/database/prisma/appointment.prisma-repository';
import { emailService } from '@/infrastructure/services/email.service';
import { generateAppointmentIcs } from '@/core/utils/ics-generator.util';
import { notificationService } from '@/infrastructure/services/notification.service';
import logger from '@/helpers/logger.helpers';

const appointmentRepository = new PrismaAppointmentRepository();

export const notificationWorker = new Worker(
    'notifications',
    async (job: Job) => {
        const { type, appointmentId, tenantId, reason } = job.data;

        logger.info(`[NotificationWorker] Processing job ${job.id} of type ${type} for appointment ${appointmentId}`);

        try {
            // 1. Fetch full appointment details
            const appointment = await appointmentRepository.findById(tenantId, appointmentId, true);

            if (!appointment || !appointment.user || !appointment.user.email) {
                logger.warn(`[NotificationWorker] Skipping job: Appointment or user email not found for ID ${appointmentId}`);
                return;
            }

            const userEmail = appointment.user.email;
            const userName = appointment.user.name;
            const serviceName = appointment.service?.name || 'Service';
            const staffName = appointment.staff?.name || 'Staff Member';
            const duration = appointment.service?.duration || 30;

            if (type === 'CONFIRMED') {
                // Generate ICS
                let icsContent: string | undefined;
                try {
                    icsContent = await generateAppointmentIcs({
                        id: appointment.id,
                        title: `${serviceName} with ${staffName}`,
                        description: `Confirmation of your ${serviceName} appointment with ${staffName}.`,
                        startTime: appointment.startTime,
                        duration: duration,
                        organizer: { name: staffName, email: 'no-reply@neutra.com' }
                    });
                } catch (icsError: any) {
                    logger.error(`[NotificationWorker] Failed to generate ICS for appointment ${appointmentId}: ${icsError.message}`);
                }

                const attachments = icsContent ? [{
                    filename: 'appointment.ics',
                    content: icsContent,
                    contentType: 'text/calendar; charset=utf-8; method=REQUEST'
                }] : [];

                // Dispatch Multi-channel
                // 1. Email (Mandatory)
                await emailService.sendAppointmentConfirmation(
                    userEmail,
                    {
                        id: appointment.id,
                        userName,
                        serviceName,
                        staffName,
                        appointmentDate: appointment.startTime.toLocaleDateString(),
                        appointmentTime: appointment.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        duration,
                        notes: appointment.notes,
                    },
                    undefined,
                    attachments
                );

                // 2. WhatsApp (Optional - if phone exists)
                const userPhone = (appointment.user as any)?.phone;
                if (userPhone) {
                    await notificationService.notify(
                        ['WHATSAPP'],
                        { WHATSAPP: userPhone },
                        {
                            body: `Hola ${userName}, tu cita para ${serviceName} con ${staffName} el ${appointment.startTime.toLocaleDateString()} a las ${appointment.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ha sido CONFIRMADA.`
                        }
                    );
                }

                // 3. Push (Optional)
                const pushToken = (appointment.user as any)?.pushToken;
                if (pushToken) {
                    await notificationService.notify(
                        ['PUSH'],
                        { PUSH: pushToken },
                        {
                            subject: 'Cita Confirmada',
                            body: `Tu cita para ${serviceName} ha sido confirmada.`
                        }
                    );
                }

            } else if (type === 'CANCELLED') {
                // 1. Email
                await emailService.sendAppointmentCancellation(
                    userEmail,
                    {
                        id: appointment.id,
                        userName,
                        serviceName,
                        staffName,
                        appointmentDate: appointment.startTime.toLocaleDateString(),
                        cancellationReason: reason || 'Administrativa',
                    }
                );

                // 2. WhatsApp
                const userPhone = (appointment.user as any)?.phone;
                if (userPhone) {
                    await notificationService.notify(
                        ['WHATSAPP'],
                        { WHATSAPP: userPhone },
                        {
                            body: `Hola ${userName}, lamentamos informarte que tu cita para ${serviceName} el ${appointment.startTime.toLocaleDateString()} ha sido CANCELADA. Razón: ${reason || 'Administrativa'}.`
                        }
                    );
                }

                // 3. Push
                const pushToken = (appointment.user as any)?.pushToken;
                if (pushToken) {
                    await notificationService.notify(
                        ['PUSH'],
                        { PUSH: pushToken },
                        {
                            subject: 'Cita Cancelada',
                            body: `Tu cita para ${serviceName} ha sido cancelada.`
                        }
                    );
                }
            } else if (type === 'WELCOME_EMAIL') {
                const { email, name: userName } = job.data;
                await emailService.sendWelcomeEmail(email, userName, {
                    tenantName: 'Neutra', // TODO: Get from tenant configuration
                    supportEmail: process.env.SMTP_FROM || 'support@neutra.com',
                    websiteUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
                    primaryColor: '#000000',
                });
            }

            logger.info(`[NotificationWorker] Job ${job.id} completed successfully`);
        } catch (error: any) {
            logger.error(`[NotificationWorker] Job ${job.id} failed: ${error.message}`);
            throw error; // Re-throw to allow BullMQ to retry
        }
    },
    {
        connection: redisOptions,
        concurrency: 5 // Process up to 5 jobs simultaneously
    }
);

notificationWorker.on('failed', (job, err) => {
    logger.error(`[NotificationWorker] Job ${job?.id} failed definitely: ${err.message}`);
});
