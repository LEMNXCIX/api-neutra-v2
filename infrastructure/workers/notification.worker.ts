import { Worker } from "bullmq";
import type { Job } from "bullmq";
import { redisOptions } from "@/infrastructure/services/queue.service";
import { generateAppointmentIcs } from "@/infrastructure/utils/ics-generator.util";
import { NotificationService } from "@/core/services/notification.service";
import type { IEmailService } from "@/core/ports/email.port";
import type { TenantConfig } from "@/core/entities/tenant.entity";
import type { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import type { ILogger } from "@/core/providers/logger.interface";

export type NotificationWorkerDependencies = {
    appointmentRepository: IAppointmentRepository;
    tenantRepository: ITenantRepository;
    emailService: IEmailService;
    notificationService: NotificationService;
    logger: ILogger;
    connection?: typeof redisOptions;
    generateAppointmentIcs?: typeof generateAppointmentIcs;
};

interface ResolvedTenantConfig {
    tenantConfig: {
        tenantName: string;
        tenantLogo?: string;
        supportEmail: string;
        websiteUrl: string;
        primaryColor: string;
    };
    notificationSettings: Record<string, unknown> | null;
}

const DEFAULT_TENANT_CONFIG: ResolvedTenantConfig["tenantConfig"] = {
    tenantName: "Neutra",
    supportEmail: process.env.SMTP_FROM || "support@neutra.com",
    websiteUrl: "http://localhost:3000",
    primaryColor: "#000000",
};

function isChannelEnabled(
    notificationSettings: Record<string, unknown> | null,
    channel: "email" | "whatsapp" | "push",
    eventType?: string,
): boolean {
    if (!notificationSettings) return true;
    const events = notificationSettings.events as
        | Record<string, Record<string, boolean>>
        | undefined;
    const channels = notificationSettings.channels as
        | Record<string, boolean>
        | undefined;
    if (eventType && events?.[eventType]?.[channel] !== undefined)
        return events[eventType][channel];
    if (channels?.[channel] !== undefined) return channels[channel];
    return true;
}

function getBaseUrl(origin: string | undefined): string {
    return origin || process.env.FRONTEND_URL || "http://localhost:3000";
}

export function createNotificationWorker(
    dependencies: NotificationWorkerDependencies,
): Worker {
    const {
        appointmentRepository,
        tenantRepository,
        emailService: emailClient,
        notificationService: notifications,
        logger: log,
        connection = redisOptions,
        generateAppointmentIcs: generateIcs = generateAppointmentIcs,
    } = dependencies;

    async function resolveTenantConfig(
        tenantId: string | undefined,
        baseUrl: string,
    ): Promise<ResolvedTenantConfig | null> {
        if (!tenantId) return null;

        try {
            const tenant = await tenantRepository.findById(tenantId);
            if (!tenant) return null;

            const config = tenant.config as TenantConfig | undefined;

            return {
                tenantConfig: {
                    tenantName: tenant.name,
                    tenantLogo: config?.branding?.tenantLogo,
                    supportEmail:
                        config?.settings?.supportEmail ||
                        process.env.SMTP_FROM ||
                        "support@neutra.com",
                    websiteUrl: baseUrl,
                    primaryColor:
                        config?.branding?.primaryColor || "#667eea",
                },
                notificationSettings:
                    ((config as Record<string, unknown>)?.notifications as Record<
                        string,
                        unknown
                    > | null) ?? null,
            };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            log.warn(
                `[NotificationWorker] Failed to fetch tenant config: ${msg}`,
            );
            return null;
        }
    }

    const notificationWorker = new Worker(
        "notifications",
        async (job: Job) => {
            const { type, appointmentId, tenantId, reason, origin } = job.data;

            log.info(
                `[NotificationWorker] Processing job ${job.id} of type ${type} for appointment ${appointmentId}`,
            );

            try {
                if (type === "CONFIRMED" || type === "CANCELLED") {
                    const appointment = await appointmentRepository.findById(
                        tenantId,
                        appointmentId,
                        true,
                    );

                    if (
                        !appointment ||
                        !appointment.user ||
                        !appointment.user.email
                    ) {
                        log.warn(
                            `[NotificationWorker] Skipping job: Appointment or user email not found for ID ${appointmentId}`,
                        );
                        return;
                    }

                    const userEmail = appointment.user.email;
                    const userName = appointment.user.name;
                    const serviceName =
                        appointment.service?.name || "Service";
                    const staffName =
                        appointment.staff?.name || "Staff Member";
                    const duration = appointment.service?.duration || 30;

                    const baseUrl = getBaseUrl(origin);
                    const resolved = await resolveTenantConfig(
                        tenantId,
                        baseUrl,
                    );
                    const tenantConfig = resolved?.tenantConfig;
                    const notificationSettings =
                        resolved?.notificationSettings ?? null;

                    if (type === "CONFIRMED") {
                        let icsContent: string | undefined;
                        try {
                            icsContent = await generateIcs({
                                id: appointment.id,
                                title: `${serviceName} with ${staffName}`,
                                description: `Confirmation of your ${serviceName} appointment with ${staffName}.`,
                                startTime: appointment.startTime,
                                duration: duration,
                                organizer: {
                                    name: staffName,
                                    email: "no-reply@neutra.com",
                                },
                            });
                        } catch (icsError: unknown) {
                            const msg =
                                icsError instanceof Error
                                    ? icsError.message
                                    : String(icsError);
                            log.error(
                                `[NotificationWorker] Failed to generate ICS for appointment ${appointmentId}: ${msg}`,
                            );
                        }

                        const attachments = icsContent
                            ? [
                                  {
                                      filename: "appointment.ics",
                                      content: icsContent,
                                      contentType:
                                          "text/calendar; charset=utf-8; method=REQUEST",
                                  },
                              ]
                            : [];

                        if (
                            isChannelEnabled(
                                notificationSettings,
                                "email",
                                "appointmentConfirmed",
                            )
                        ) {
                            await emailClient.sendAppointmentConfirmation(
                                userEmail,
                                {
                                    id: appointment.id,
                                    userName,
                                    serviceName,
                                    staffName,
                                    appointmentDate:
                                        appointment.startTime.toLocaleDateString(),
                                    appointmentTime:
                                        appointment.startTime.toLocaleTimeString(
                                            [],
                                            { hour: "2-digit", minute: "2-digit" },
                                        ),
                                    duration,
                                    notes: appointment.notes,
                                },
                                tenantConfig,
                                attachments,
                            );
                            log.info(
                                `[NotificationWorker] Email sent for appointmentConfirmed`,
                            );
                        } else {
                            log.info(
                                `[NotificationWorker] Email disabled for appointmentConfirmed by tenant config`,
                            );
                        }

                        const userPhone = appointment.user.phone;
                        if (
                            userPhone &&
                            isChannelEnabled(
                                notificationSettings,
                                "whatsapp",
                                "appointmentConfirmed",
                            )
                        ) {
                            await notifications.notify(
                                ["WHATSAPP"],
                                { WHATSAPP: userPhone },
                                {
                                    body: `Hola ${userName}, tu cita para ${serviceName} con ${staffName} el ${appointment.startTime.toLocaleDateString()} a las ${appointment.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ha sido CONFIRMADA.`,
                                    templateId: "appointment_confirmed",
                                },
                                { tenantId },
                            );
                        }

                        const pushToken = appointment.user.pushToken;
                        if (pushToken) {
                            await notifications.notify(
                                ["PUSH"],
                                { PUSH: pushToken },
                                {
                                    subject: "Cita Confirmada",
                                    body: `Tu cita para ${serviceName} ha sido confirmada.`,
                                },
                            );
                        }
                    } else if (type === "CANCELLED") {
                        if (
                            isChannelEnabled(
                                notificationSettings,
                                "email",
                                "appointmentCancelled",
                            )
                        ) {
                            await emailClient.sendAppointmentCancellation(
                                userEmail,
                                {
                                    id: appointment.id,
                                    userName,
                                    serviceName,
                                    staffName,
                                    appointmentDate:
                                        appointment.startTime.toLocaleDateString(),
                                    appointmentTime:
                                        appointment.startTime.toLocaleTimeString(
                                            [],
                                            { hour: "2-digit", minute: "2-digit" },
                                        ),
                                    duration,
                                    cancellationReason: reason || "Administrativa",
                                },
                                tenantConfig,
                            );
                        }

                        const userPhone = appointment.user.phone;
                        if (
                            userPhone &&
                            isChannelEnabled(
                                notificationSettings,
                                "whatsapp",
                                "appointmentCancelled",
                            )
                        ) {
                            await notifications.notify(
                                ["WHATSAPP"],
                                { WHATSAPP: userPhone },
                                {
                                    body: `Hola ${userName}, lamentamos informarte que tu cita para ${serviceName} el ${appointment.startTime.toLocaleDateString()} a las ${appointment.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ha sido CANCELADA. Razón: ${reason || "Administrativa"}.`,
                                    templateId: "appointment_cancelled",
                                },
                                { tenantId },
                            );
                        }

                        const pushToken = appointment.user.pushToken;
                        if (
                            pushToken &&
                            isChannelEnabled(
                                notificationSettings,
                                "push",
                                "appointmentCancelled",
                            )
                        ) {
                            await notifications.notify(
                                ["PUSH"],
                                { PUSH: pushToken },
                                {
                                    subject: "Cita Cancelada",
                                    body: `Tu cita para ${serviceName} ha sido cancelada.`,
                                },
                            );
                        }
                    }
                } else if (type === "PENDING_APPROVAL") {
                    const appointment = await appointmentRepository.findById(
                        tenantId,
                        appointmentId,
                        true,
                    );

                    if (
                        !appointment ||
                        !appointment.staff ||
                        !appointment.user
                    ) {
                        log.warn(
                            `[NotificationWorker] Skipping PENDING_APPROVAL: Missing appointment, staff, or user for ID ${appointmentId}`,
                        );
                        return;
                    }

                    const staffEmail = appointment.staff.email;
                    if (!staffEmail) {
                        log.warn(
                            `[NotificationWorker] Skipping PENDING_APPROVAL: Staff email not found for appointment ${appointmentId}`,
                        );
                        return;
                    }

                    const userName = appointment.user.name;
                    const serviceName =
                        appointment.service?.name || "Service";
                    const staffName = appointment.staff.name;

                    const baseUrl = getBaseUrl(origin);
                    const resolved = await resolveTenantConfig(
                        tenantId,
                        baseUrl,
                    );
                    const tenantConfig = resolved?.tenantConfig;
                    const notificationSettings =
                        resolved?.notificationSettings ?? null;

                    if (
                        isChannelEnabled(
                            notificationSettings,
                            "email",
                            "appointmentPending",
                        )
                    ) {
                        await emailClient.sendEmail(
                            staffEmail,
                            "Nueva Cita Pendiente de Aprobación",
                            "appointment-pending-approval",
                            {
                                staffName,
                                userName,
                                serviceName,
                                appointmentDate:
                                    appointment.startTime.toLocaleDateString(),
                                appointmentTime:
                                    appointment.startTime.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    }),
                                duration: appointment.service?.duration || 30,
                                notes: appointment.notes || "Sin notas",
                                appointmentId: appointment.id,
                                approveLink: `${baseUrl}/admin/appointments/${appointment.id}/approve`,
                                rejectLink: `${baseUrl}/admin/appointments/${appointment.id}/reject`,
                                year: new Date().getFullYear(),
                            },
                            tenantConfig,
                        );
                        log.info(
                            `[NotificationWorker] PENDING_APPROVAL notification sent to staff ${staffEmail}`,
                        );
                    } else {
                        log.info(
                            `[NotificationWorker] Email disabled for appointmentPending by tenant config`,
                        );
                    }
                } else if (type === "WELCOME_EMAIL") {
                    const { email, name: userName, tenantId } = job.data;
                    const baseUrl = getBaseUrl(origin);

                    const resolved = await resolveTenantConfig(
                        tenantId,
                        baseUrl,
                    );
                    const tenantConfig = resolved?.tenantConfig ?? {
                        ...DEFAULT_TENANT_CONFIG,
                        websiteUrl: baseUrl,
                    };
                    const notificationSettings =
                        resolved?.notificationSettings ?? null;

                    if (
                        isChannelEnabled(
                            notificationSettings,
                            "email",
                            "welcome",
                        )
                    ) {
                        await emailClient.sendWelcomeEmail(
                            email,
                            userName,
                            tenantConfig,
                        );
                        log.info(
                            `[NotificationWorker] WELCOME_EMAIL sent to ${email}`,
                        );
                    } else {
                        log.info(
                            `[NotificationWorker] Email disabled for welcome by tenant config`,
                        );
                    }
                } else if (type === "PASSWORD_RESET") {
                    const { email, resetLink, tenantId } = job.data;
                    const baseUrl = getBaseUrl(origin);

                    const resolved = await resolveTenantConfig(
                        tenantId,
                        baseUrl,
                    );
                    const tenantConfig = resolved?.tenantConfig ?? {
                        ...DEFAULT_TENANT_CONFIG,
                        websiteUrl: baseUrl,
                        primaryColor: "#000000",
                    };
                    const notificationSettings =
                        resolved?.notificationSettings ?? null;

                    if (
                        isChannelEnabled(
                            notificationSettings,
                            "email",
                            "passwordReset",
                        )
                    ) {
                        await emailClient.sendPasswordReset(
                            email,
                            resetLink,
                            tenantConfig,
                        );
                        log.info(
                            `[NotificationWorker] PASSWORD_RESET email sent to ${email}`,
                        );
                    } else {
                        log.info(
                            `[NotificationWorker] Email disabled for passwordReset by tenant config`,
                        );
                    }
                }

                log.info(
                    `[NotificationWorker] Job ${job.id} completed successfully`,
                );
            } catch (error: unknown) {
                const msg =
                    error instanceof Error ? error.message : String(error);
                log.error(
                    `[NotificationWorker] Job ${job.id} failed: ${msg}`,
                );
                throw error;
            }
        },
        {
            connection,
            concurrency: 5,
        },
    );

    notificationWorker.on("failed", (job, err) => {
        log.error(
            `[NotificationWorker] Job ${job?.id} failed definitely: ${err.message}`,
        );
    });

    return notificationWorker;
}
