import {
    WhatsAppTemplate,
    BotConfig,
} from "@/core/entities/whatsapp-config.entity";

export interface ConfigureWhatsAppDTO {
    phoneNumberId?: string;
    businessAccountId?: string;
    accessToken?: string;
    webhookVerifyToken?: string;
    enabled?: boolean;
    notificationsEnabled?: boolean;
    botEnabled?: boolean;
    templates?: WhatsAppTemplate[];
    botConfig?: BotConfig;
}

export interface SendNotificationDTO {
    tenantId: string;
    to: string;
    templateName: string;
    languageCode?: string;
    components?: Array<{
        type: string;
        parameters?: Array<Record<string, unknown>>;
    }>;
}

import {
    IsBoolean,
    IsOptional,
    IsString,
    MinLength,
} from "class-validator";

export class ConfigureWhatsAppDto {
    @IsString()
    @MinLength(1, { message: "phoneNumberId is required" })
    phoneNumberId!: string;

    @IsOptional()
    @IsString()
    businessAccountId?: string;

    @IsOptional()
    @IsString()
    @MinLength(10)
    accessToken?: string;

    @IsOptional()
    @IsString()
    webhookVerifyToken?: string;

    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @IsOptional()
    @IsBoolean()
    notificationsEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    botEnabled?: boolean;

    @IsOptional()
    templates?: WhatsAppTemplate[];

    @IsOptional()
    botConfig?: BotConfig;
}
