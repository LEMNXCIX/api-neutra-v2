import { NodemailerProvider } from '@/infrastructure/providers/nodemailer.provider';
import { IEmailService } from '@/core/ports/email.port';

/**
 * Email Service Singleton
 * Provides a single instance of the email service throughout the application
 */
class EmailServiceSingleton {
    private static instance: IEmailService | null = null;

    private constructor() { }

    public static getInstance(): IEmailService {
        if (!EmailServiceSingleton.instance) {
            EmailServiceSingleton.instance = new NodemailerProvider();
        }
        return EmailServiceSingleton.instance;
    }
}

export const emailService = EmailServiceSingleton.getInstance();
