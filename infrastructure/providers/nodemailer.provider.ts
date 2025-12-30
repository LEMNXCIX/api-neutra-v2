import nodemailer, { Transporter } from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { IEmailService, TenantEmailConfig } from '@/core/ports/email.port';

export class NodemailerProvider implements IEmailService {
    private transporter: Transporter;
    private templatesPath: string;

    constructor() {
        // Initialize SMTP transporter
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Set templates directory - use absolute path from project root
        this.templatesPath = path.join(process.cwd(), 'infrastructure', 'email-templates');
    }

    /**
     * Send email using specified template
     */
    async sendEmail(
        to: string,
        subject: string,
        template: string,
        data: Record<string, any>,
        tenantConfig?: TenantEmailConfig,
        attachments?: any[]
    ): Promise<boolean> {
        try {
            // 1. Load and compile specific template (Content)
            const templatePath = path.join(this.templatesPath, `${template}.hbs`);

            if (!fs.existsSync(templatePath)) {
                console.error(`Email template not found: ${templatePath}`);
                return false;
            }

            const templateContent = fs.readFileSync(templatePath, 'utf-8');
            const compiledTemplate = handlebars.compile(templateContent);

            // Merge tenant config with data and add year
            const emailData = {
                ...data,
                year: new Date().getFullYear(),
                tenant: tenantConfig || this.getDefaultTenantConfig(),
            };

            // Render specific content
            const contentHtml = compiledTemplate(emailData);

            // 2. Load and compile Base Layout
            const layoutPath = path.join(this.templatesPath, 'base-layout.hbs');
            let finalHtml = contentHtml;

            if (fs.existsSync(layoutPath)) {
                const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
                const compiledLayout = handlebars.compile(layoutContent);

                // Render layout with content injected
                finalHtml = compiledLayout({
                    ...emailData,
                    content: contentHtml,
                });
            } else {
                console.warn('Base layout not found, sending content only');
            }

            // Send email
            const info = await this.transporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to,
                subject,
                html: finalHtml,
                attachments,
            });

            console.log('Email sent successfully:', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }

    /**
     * Send welcome email to new user
     */
    async sendWelcomeEmail(
        to: string,
        name: string,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean> {
        return this.sendEmail(
            to,
            'Welcome to ' + (tenantConfig?.tenantName || 'Neutra'),
            'welcome',
            { name },
            tenantConfig
        );
    }

    /**
     * Send order confirmation email
     */
    async sendOrderConfirmation(
        to: string,
        order: any,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean> {
        return this.sendEmail(
            to,
            `Order Confirmation #${order.id}`,
            'order-confirmation',
            { order },
            tenantConfig
        );
    }

    /**
     * Send password reset email
     */
    async sendPasswordReset(
        to: string,
        resetLink: string,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean> {
        return this.sendEmail(
            to,
            'Password Reset Request',
            'password-reset',
            { resetLink },
            tenantConfig
        );
    }

    /**
     * Send appointment confirmation email
     */
    async sendAppointmentConfirmation(
        to: string,
        appointment: any,
        tenantConfig?: TenantEmailConfig,
        attachments?: any[]
    ): Promise<boolean> {
        return this.sendEmail(
            to,
            'Appointment Confirmed',
            'appointment-confirmation',
            {
                userName: appointment.userName,
                serviceName: appointment.serviceName,
                staffName: appointment.staffName,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                duration: appointment.duration,
                notes: appointment.notes,
                appointmentId: appointment.id,
                calendarLink: appointment.calendarLink || '#',
            },
            tenantConfig,
            attachments
        );
    }

    /**
     * Send appointment reminder email
     */
    async sendAppointmentReminder(
        to: string,
        appointment: any,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean> {
        return this.sendEmail(
            to,
            'Appointment Reminder',
            'appointment-reminder',
            {
                userName: appointment.userName,
                serviceName: appointment.serviceName,
                staffName: appointment.staffName,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                duration: appointment.duration,
                appointmentId: appointment.id,
            },
            tenantConfig
        );
    }

    /**
     * Send appointment cancellation email
     */
    async sendAppointmentCancellation(
        to: string,
        appointment: any,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean> {
        return this.sendEmail(
            to,
            'Appointment Cancelled',
            'appointment-cancellation',
            {
                userName: appointment.userName,
                serviceName: appointment.serviceName,
                staffName: appointment.staffName,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
                cancellationReason: appointment.cancellationReason,
                appointmentId: appointment.id,
            },
            tenantConfig
        );
    }

    /**
     * Get default tenant configuration
     */
    private getDefaultTenantConfig(): TenantEmailConfig {
        return {
            tenantName: 'Neutra',
            supportEmail: process.env.SMTP_FROM || 'support@neutra.com',
            websiteUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            primaryColor: '#000000',
        };
    }
}
