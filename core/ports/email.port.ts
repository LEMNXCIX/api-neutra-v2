/**
 * Email Service Port
 * Defines the contract for email sending capabilities
 */

export interface IEmailService {
    /**
     * Send a generic email
     * @param to Recipient email address
     * @param subject Email subject
     * @param template Template name
     * @param data Template data
     * @param tenantConfig Tenant-specific branding configuration
     */
    sendEmail(
        to: string,
        subject: string,
        template: string,
        data: Record<string, any>,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean>;

    /**
     * Send welcome email to new user
     */
    sendWelcomeEmail(
        to: string,
        name: string,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean>;

    /**
     * Send order confirmation email
     */
    sendOrderConfirmation(
        to: string,
        order: any,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean>;

    /**
     * Send password reset email
     */
    sendPasswordReset(
        to: string,
        resetLink: string,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean>;

    /**
     * Send appointment confirmation email
     */
    sendAppointmentConfirmation(
        to: string,
        appointment: any,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean>;

    /**
     * Send appointment reminder email
     */
    sendAppointmentReminder(
        to: string,
        appointment: any,
        tenantConfig?: TenantEmailConfig
    ): Promise<boolean>;

    /**
     * Send appointment cancellation email
     */
    sendAppointmentCancellation(
        to: string,
        appointment: any,
        tenantConfig?: TenantEmailConfig
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
