/**
 * Email Service Port
 * Defines the contract for email sending capabilities
 */

export interface OrderEmailData {
    id: string;
    items: Array<{ product?: { name: string }; amount: number; price: number }>;
    subtotal: number;
    total: number;
    discountAmount: number;
    createdAt: Date;
    trackingNumber?: string | null;
}

export interface AppointmentEmailData {
    id: string;
    userName: string;
    serviceName: string;
    staffName: string;
    appointmentDate: string;
    appointmentTime: string;
    duration: number;
    notes?: string | null;
    cancellationReason?: string | null;
}

export interface IEmailService {
    sendEmail(
        to: string,
        subject: string,
        template: string,
        data: Record<string, unknown>,
        tenantConfig?: TenantEmailConfig,
        attachments?: Attachment[],
    ): Promise<boolean>;

    sendWelcomeEmail(
        to: string,
        name: string,
        tenantConfig?: TenantEmailConfig,
    ): Promise<boolean>;

    sendOrderConfirmation(
        to: string,
        order: OrderEmailData,
        tenantConfig?: TenantEmailConfig,
    ): Promise<boolean>;

    sendPasswordReset(
        to: string,
        resetLink: string,
        tenantConfig?: TenantEmailConfig,
    ): Promise<boolean>;

    sendAppointmentConfirmation(
        to: string,
        appointment: AppointmentEmailData,
        tenantConfig?: TenantEmailConfig,
        attachments?: Attachment[],
    ): Promise<boolean>;

    sendAppointmentReminder(
        to: string,
        appointment: AppointmentEmailData,
        tenantConfig?: TenantEmailConfig,
    ): Promise<boolean>;

    sendAppointmentCancellation(
        to: string,
        appointment: AppointmentEmailData,
        tenantConfig?: TenantEmailConfig,
    ): Promise<boolean>;
}

/**
 * Tenant Email Configuration
 * Branding and customization for tenant-specific emails
 */
export interface TenantEmailConfig {
    tenantName: string;
    tenantLogo?: string;
    primaryColor?: string;
    supportEmail?: string;
    websiteUrl?: string;
}

/**
 * Email Attachment
 */
export interface Attachment {
    filename: string;
    content: string | Buffer;
    contentType?: string;
}
