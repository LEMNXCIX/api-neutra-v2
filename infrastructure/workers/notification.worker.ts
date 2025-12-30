import { Worker, Job } from 'bullmq';
import { redisOptions } from '@/infrastructure/services/queue.service';
import { PrismaAppointmentRepository } from '@/infrastructure/database/prisma/appointment.prisma-repository';
import { emailService } from '@/infrastructure/services/email.service';
import { generateAppointmentIcs } from '@/core/utils/ics-generator.util';
import { notificationService } from '@/infrastructure/services/notification.service';
import { TenantConfig } from '@/core/entities/tenant.entity';
import logger from '@/helpers/logger.helpers';

const appointmentRepository = new PrismaAppointmentRepository();

export const notificationWorker = new Worker(
    'notifications',
    async (job: Job) => {
        const { type, appointmentId, tenantId, reason, origin } = job.data;

        logger.info(`[NotificationWorker] Processing job ${job.id} of type ${type} for appointment ${appointmentId}`);

        try {
            if (type === 'CONFIRMED' || type === 'CANCELLED') {
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

                // Fetch tenant configuration with origin
                let tenantConfig;
                let notificationSettings: any = null;
                const baseUrl = origin || process.env.FRONTEND_URL || 'http://localhost:3000';

                if (tenantId) {
                    try {
                        const { prisma } = await import('@/config/db.config');
                        const tenant = await prisma.tenant.findUnique({
                            where: { id: tenantId },
                            select: {
                                name: true,
                                config: true
                            }
                        });

                        if (tenant) {
                            const config = tenant.config as unknown as TenantConfig;
                            // User requested to rely on request origin (baseUrl), preventing config override
                            const websiteUrl = baseUrl;

                            tenantConfig = {
                                tenantName: tenant.name,
                                tenantLogo: config?.branding?.tenantLogo,
                                supportEmail: config?.settings?.supportEmail || process.env.SMTP_FROM || 'support@neutra.com',
                                websiteUrl: websiteUrl,
                                primaryColor: config?.branding?.primaryColor || '#667eea',
                            };

                            // Extract notification settings for channel verification
                            notificationSettings = config?.features || (config as any)?.notifications || null;
                            // Fallback for notifications if not in features (support legacy structure if needed, or if separated)
                            notificationSettings = (config as any)?.notifications || null;
                        }
                    } catch (error: any) {
                        logger.warn(`[NotificationWorker] Failed to fetch tenant config: ${error.message}`);
                    }
                }

                // Helper function to check if a notification channel is enabled
                // This is extensible for future channels (whatsapp, push, sms, etc.)
                const isChannelEnabled = (channel: 'email' | 'whatsapp' | 'push', eventType?: string): boolean => {
                    // If no settings, default to enabled
                    if (!notificationSettings) return true;

                    // Check event-specific settings first (higher priority)
                    if (eventType && notificationSettings.events?.[eventType]?.[channel] !== undefined) {
                        return notificationSettings.events[eventType][channel];
                    }

                    // Fall back to global channel settings
                    if (notificationSettings.channels?.[channel] !== undefined) {
                        return notificationSettings.channels[channel];
                    }

                    // Default to enabled if not configured
                    return true;
                };

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
                    // 1. Email - Check if enabled for this event
                    if (isChannelEnabled('email', 'appointmentConfirmed')) {
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
                            tenantConfig,
                            attachments
                        );
                        logger.info(`[NotificationWorker] Email sent for appointmentConfirmed`);
                    } else {
                        logger.info(`[NotificationWorker] Email disabled for appointmentConfirmed by tenant config`);
                    }

                    // 2. WhatsApp (Optional - if phone exists)
                    const userPhone = (appointment.user as any)?.phone;
                    if (userPhone && isChannelEnabled('whatsapp', 'appointmentConfirmed')) {
                        await notificationService.notify(
                            ['WHATSAPP'],
                            { WHATSAPP: userPhone },
                            {
                                body: `Hola ${userName}, tu cita para ${serviceName} con ${staffName} el ${appointment.startTime.toLocaleDateString()} a las ${appointment.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ha sido CONFIRMADA.`,
                                templateId: 'appointment_confirmed' // Example template name, fallback to body text if not found/configured
                            },
                            { tenantId }
                        );
                    }

                    // 3. Push (Optional)
                    // TODO: Add channel verification when Push is implemented
                    // if (isChannelEnabled('push', 'appointmentConfirmed')) { ... }
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
                    if (isChannelEnabled('email', 'appointmentCancelled')) {
                        await emailService.sendAppointmentCancellation(
                            userEmail,
                            {
                                id: appointment.id,
                                userName,
                                serviceName,
                                staffName,
                                appointmentDate: appointment.startTime.toLocaleDateString(),
                                cancellationReason: reason || 'Administrativa',
                            },
                            tenantConfig
                        );
                        // logger.info is implicit in emailService or handled earlier
                    }

                    // 2. WhatsApp
                    const userPhone = (appointment.user as any)?.phone;
                    if (userPhone && isChannelEnabled('whatsapp', 'appointmentCancelled')) {
                        await notificationService.notify(
                            ['WHATSAPP'],
                            { WHATSAPP: userPhone },
                            {
                                body: `Hola ${userName}, lamentamos informarte que tu cita para ${serviceName} el ${appointment.startTime.toLocaleDateString()} ha sido CANCELADA. Razón: ${reason || 'Administrativa'}.`,
                                templateId: 'appointment_cancelled'
                            },
                            { tenantId }
                        );
                    }

                    // 3. Push
                    const pushToken = (appointment.user as any)?.pushToken;
                    if (pushToken && isChannelEnabled('push', 'appointmentCancelled')) {
                        await notificationService.notify(
                            ['PUSH'],
                            { PUSH: pushToken },
                            {
                                subject: 'Cita Cancelada',
                                body: `Tu cita para ${serviceName} ha sido cancelada.`
                            }
                        );
                    }
                }
            } else if (type === 'PENDING_APPROVAL') {
                // New appointment created - notify STAFF for approval
                const appointment = await appointmentRepository.findById(tenantId, appointmentId, true);

                if (!appointment || !appointment.staff || !appointment.user) {
                    logger.warn(`[NotificationWorker] Skipping PENDING_APPROVAL: Missing appointment, staff, or user for ID ${appointmentId}`);
                    return;
                }

                const staffEmail = (appointment.staff as any)?.email;
                if (!staffEmail) {
                    logger.warn(`[NotificationWorker] Skipping PENDING_APPROVAL: Staff email not found for appointment ${appointmentId}`);
                    return;
                }

                const userName = appointment.user.name;
                const serviceName = appointment.service?.name || 'Service';
                const staffName = appointment.staff.name;

                // Fetch tenant configuration
                let tenantConfig: any;
                let notificationSettings: any = null;
                const baseUrl = origin || process.env.FRONTEND_URL || 'http://localhost:3000';
                let finalBaseUrl = baseUrl;

                if (tenantId) {
                    try {
                        const { prisma } = await import('@/config/db.config');
                        const tenant = await prisma.tenant.findUnique({
                            where: { id: tenantId },
                            select: {
                                name: true,
                                config: true
                            }
                        });

                        if (tenant) {
                            const config = tenant.config as unknown as TenantConfig;
                            // User requested to rely on request origin (baseUrl)
                            const websiteUrl = baseUrl;
                            finalBaseUrl = websiteUrl;

                            tenantConfig = {
                                tenantName: tenant.name,
                                tenantLogo: config?.branding?.tenantLogo,
                                supportEmail: config?.settings?.supportEmail || process.env.SMTP_FROM || 'support@neutra.com',
                                websiteUrl: websiteUrl,
                                primaryColor: config?.branding?.primaryColor || '#667eea',
                            };

                            // Extract notification settings
                            notificationSettings = (config as any)?.notifications || null;
                        }
                    } catch (error: any) {
                        logger.warn(`[NotificationWorker] Failed to fetch tenant config for PENDING_APPROVAL: ${error.message}`);
                    }
                }

                // Helper function (scoped to this block)
                const isChannelEnabled = (channel: 'email' | 'whatsapp' | 'push', eventType?: string): boolean => {
                    if (!notificationSettings) return true;
                    if (eventType && notificationSettings.events?.[eventType]?.[channel] !== undefined) {
                        return notificationSettings.events[eventType][channel];
                    }
                    if (notificationSettings.channels?.[channel] !== undefined) {
                        return notificationSettings.channels[channel];
                    }
                    return true;
                };

                // Send email to staff - Check if enabled
                if (isChannelEnabled('email', 'appointmentPending')) {
                    await emailService.sendEmail(
                        staffEmail,
                        'Nueva Cita Pendiente de Aprobación',
                        'appointment-pending-approval',
                        {
                            staffName,
                            userName,
                            serviceName,
                            appointmentDate: appointment.startTime.toLocaleDateString(),
                            appointmentTime: appointment.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            duration: appointment.service?.duration || 30,
                            notes: appointment.notes || 'Sin notas',
                            appointmentId: appointment.id,
                            approveLink: `${finalBaseUrl}/admin/appointments/${appointment.id}/approve`,
                            rejectLink: `${finalBaseUrl}/admin/appointments/${appointment.id}/reject`,
                            year: new Date().getFullYear(),
                        },
                        tenantConfig
                    );
                    logger.info(`[NotificationWorker] PENDING_APPROVAL notification sent to staff ${staffEmail}`);
                } else {
                    logger.info(`[NotificationWorker] Email disabled for appointmentPending by tenant config`);
                }
            } else if (type === 'WELCOME_EMAIL') {
                const { email, name: userName, tenantId } = job.data;
                const baseUrl = origin || process.env.FRONTEND_URL || 'http://localhost:3000';

                let tenantConfig: any = {
                    tenantName: 'Neutra',
                    supportEmail: process.env.SMTP_FROM || 'support@neutra.com',
                    websiteUrl: baseUrl,
                    primaryColor: '#000000', // Default
                };
                let notificationSettings: any = null;

                if (tenantId) {
                    try {
                        const { prisma } = await import('@/config/db.config');
                        const tenant = await prisma.tenant.findUnique({
                            where: { id: tenantId },
                            select: {
                                name: true,
                                config: true
                            }
                        });

                        if (tenant) {
                            const config = tenant.config as unknown as TenantConfig;
                            // User requested to rely on request origin
                            const websiteUrl = baseUrl;

                            tenantConfig = {
                                tenantName: tenant.name,
                                tenantLogo: config?.branding?.tenantLogo,
                                supportEmail: config?.settings?.supportEmail || process.env.SMTP_FROM || 'support@neutra.com',
                                websiteUrl: websiteUrl,
                                primaryColor: config?.branding?.primaryColor || '#667eea',
                            };
                            notificationSettings = (config as any)?.notifications || null;
                        }
                    } catch (error: any) {
                        logger.warn(`[NotificationWorker] Failed to fetch tenant config for WELCOME_EMAIL: ${error.message}`);
                    }
                }

                // Helper function (scoped to this block)
                const isChannelEnabled = (channel: 'email' | 'whatsapp' | 'push', eventType?: string): boolean => {
                    if (!notificationSettings) return true;
                    if (eventType && notificationSettings.events?.[eventType]?.[channel] !== undefined) {
                        return notificationSettings.events[eventType][channel];
                    }
                    if (notificationSettings.channels?.[channel] !== undefined) {
                        return notificationSettings.channels[channel];
                    }
                    return true;
                };

                if (isChannelEnabled('email', 'welcome')) {
                    await emailService.sendWelcomeEmail(email, userName, tenantConfig);
                    logger.info(`[NotificationWorker] WELCOME_EMAIL sent to ${email}`);
                } else {
                    logger.info(`[NotificationWorker] Email disabled for welcome by tenant config`);
                }
            } else if (type === 'PASSWORD_RESET') {
                const { email, resetLink, tenantId } = job.data;

                // Fetch tenant configuration if tenantId is provided
                let tenantConfig;
                let notificationSettings: any = null;
                const baseUrl = origin || process.env.FRONTEND_URL || 'http://localhost:3000';

                if (tenantId) {
                    try {
                        const { prisma } = await import('@/config/db.config');
                        const tenant = await prisma.tenant.findUnique({
                            where: { id: tenantId },
                            select: {
                                name: true,
                                config: true
                            }
                        });

                        if (tenant) {
                            const config = tenant.config as unknown as TenantConfig;
                            // User requested to rely on request origin
                            const websiteUrl = baseUrl;

                            tenantConfig = {
                                tenantName: tenant.name,
                                tenantLogo: config?.branding?.tenantLogo,
                                supportEmail: config?.settings?.supportEmail || process.env.SMTP_FROM || 'support@neutra.com',
                                websiteUrl: websiteUrl,
                                primaryColor: config?.branding?.primaryColor || '#000000',
                            };
                            notificationSettings = (config as any)?.notifications || null;
                        }
                    } catch (error: any) {
                        logger.warn(`[NotificationWorker] Failed to fetch tenant config for password reset: ${error.message}`);
                    }
                }

                // Helper function (scoped to this block)
                const isChannelEnabled = (channel: 'email' | 'whatsapp' | 'push', eventType?: string): boolean => {
                    if (!notificationSettings) return true;
                    if (eventType && notificationSettings.events?.[eventType]?.[channel] !== undefined) {
                        return notificationSettings.events[eventType][channel];
                    }
                    if (notificationSettings.channels?.[channel] !== undefined) {
                        return notificationSettings.channels[channel];
                    }
                    return true;
                };

                if (isChannelEnabled('email', 'passwordReset')) {
                    await emailService.sendPasswordReset(email, resetLink, tenantConfig);
                    logger.info(`[NotificationWorker] PASSWORD_RESET email sent to ${email}`);
                } else {
                    logger.info(`[NotificationWorker] Email disabled for passwordReset by tenant config`);
                }
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
