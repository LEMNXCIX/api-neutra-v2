import { plainToInstance, Transform } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsObject,
    IsOptional,
    IsString,
    MinLength,
    ValidateNested,
} from "class-validator";
import type {
    BotConfig,
    WhatsAppTemplate,
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

/**
 * One element of a template's `components`, validated through the same
 * nested-class shape `CreateLoyaltyCampaignDto` uses for its reward: without
 * it a `components` array of strings would reach
 * `IWhatsAppService.sendTemplateMessage` and fail at the provider.
 */
export class WhatsAppComponentDto {
    @IsString()
    type!: string;

    @IsOptional()
    @IsArray()
    @IsObject({ each: true })
    parameters?: Array<Record<string, unknown>>;
}

/**
 * The body of `POST /api/whatsapp/send-template`.
 *
 * `tenantId` is absent because `WhatsAppController.sendTemplate` sets it from
 * `req.tenantId` after the spread: the tenant is the authenticated context,
 * and a body naming another one is not what the message is sent as. The class
 * therefore does not implement `SendNotificationDTO`, which still requires
 * `tenantId` because that is what the use case takes.
 */
export class SendNotificationDto {
    @IsString()
    to!: string;

    @IsString()
    templateName!: string;

    @IsOptional()
    @IsString()
    languageCode?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Transform(
        ({ value }) =>
            Array.isArray(value) &&
            value.map((entry: unknown) =>
                plainToInstance(WhatsAppComponentDto, entry),
            ),
        { toClassOnly: true },
    )
    components?: WhatsAppComponentDto[];
}
