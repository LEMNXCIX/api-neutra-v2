import { IConfigProvider } from "@/core/providers/config-provider.interface";

export class EnvConfigProvider implements IConfigProvider {
    getFrontendUrl(): string {
        return process.env.FRONTEND_URL || "http://localhost:3000";
    }

    getSmtpFrom(): string {
        return process.env.SMTP_FROM || "support@neutra.com";
    }

    getNodeEnv(): string {
        return process.env.NODE_ENV || "development";
    }
}
