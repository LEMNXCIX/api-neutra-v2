/**
 * Application config port — infrastructure reads env; core/use cases depend only on this.
 */
export interface IConfigProvider {
    getFrontendUrl(): string;
    getSmtpFrom(): string;
    /** Raw environment string (ENVIRONMENT or NODE_ENV) */
    getNodeEnv(): string;
    /** Comma-separated CORS allowlist (optional) */
    getAllowedOrigins(): string;
    getWhatsAppVerifyToken(): string;
}
