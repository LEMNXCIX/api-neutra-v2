import { IConfigProvider } from "@/core/providers/config-provider.interface";
import config from "@/config/index.config";

/**
 * Env-backed config adapter. Prefer this (or `config`) over raw process.env outside infrastructure.
 */
export class EnvConfigProvider implements IConfigProvider {
    getFrontendUrl(): string {
        return config.frontendUrl;
    }

    getSmtpFrom(): string {
        return process.env.SMTP_FROM || "support@neutra.com";
    }

    getNodeEnv(): string {
        return config.ENVIRONMENT;
    }

    getAllowedOrigins(): string {
        return config.allowedOrigins;
    }

    getWhatsAppVerifyToken(): string {
        return config.whatsappVerifyToken;
    }
}
