import { WhatsAppConfig as PrismaWhatsAppConfig, Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { IWhatsAppConfigRepository } from "@/core/repositories/whatsapp-config.repository.interface";
import {
    WhatsAppConfig,
    WhatsAppTemplate,
    BotConfig,
} from "@/core/entities/whatsapp-config.entity";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

function parseTemplates(
    value: Prisma.JsonValue | null,
): WhatsAppTemplate[] | undefined {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) return value as unknown as WhatsAppTemplate[];
    return undefined;
}

function parseBotConfig(value: Prisma.JsonValue | null): BotConfig | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "object" && !Array.isArray(value))
        return value as BotConfig;
    return undefined;
}

function toJsonInput(
    value: WhatsAppTemplate[] | BotConfig | undefined,
): Prisma.InputJsonValue | undefined {
    if (value === undefined) return undefined;
    return value as unknown as Prisma.InputJsonValue;
}

export class WhatsAppConfigPrismaRepository implements IWhatsAppConfigRepository {
    constructor(private prisma: PrismaClient) {}

    private mapToEntity(data: PrismaWhatsAppConfig): WhatsAppConfig {
        return {
            id: data.id,
            tenantId: data.tenantId,
            phoneNumberId: data.phoneNumberId,
            businessAccountId: data.businessAccountId,
            accessToken: data.accessToken,
            webhookVerifyToken: data.webhookVerifyToken,
            enabled: data.enabled,
            notificationsEnabled: data.notificationsEnabled,
            botEnabled: data.botEnabled,
            templates: parseTemplates(data.templates),
            botConfig: parseBotConfig(data.botConfig),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    }

    async findByTenantId(tenantId: string): Promise<WhatsAppConfig | null> {
        const config = await this.prisma.whatsAppConfig.findUnique({
            where: { tenantId },
        });
        return config ? this.mapToEntity(config) : null;
    }

    async findByPhoneNumberId(
        phoneNumberId: string,
    ): Promise<WhatsAppConfig | null> {
        const config = await this.prisma.whatsAppConfig.findFirst({
            where: { phoneNumberId },
        });
        return config ? this.mapToEntity(config) : null;
    }

    async create(
        config: Omit<WhatsAppConfig, "id" | "createdAt" | "updatedAt">,
    ): Promise<WhatsAppConfig> {
        try {
            const newConfig = await this.prisma.whatsAppConfig.create({
                data: {
                    tenantId: config.tenantId,
                    phoneNumberId: config.phoneNumberId,
                    businessAccountId: config.businessAccountId,
                    accessToken: config.accessToken,
                    webhookVerifyToken: config.webhookVerifyToken,
                    enabled: config.enabled,
                    notificationsEnabled: config.notificationsEnabled,
                    botEnabled: config.botEnabled,
                    templates: toJsonInput(config.templates),
                    botConfig: toJsonInput(config.botConfig),
                },
            });
            return this.mapToEntity(newConfig);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target =
                    (error.meta?.target as string[])?.[0] ?? "tenantId";
                throw new DuplicateEntityError(
                    "WhatsAppConfig",
                    target,
                    config.tenantId,
                );
            }
            throw error;
        }
    }

    async update(
        tenantId: string,
        config: Partial<WhatsAppConfig>,
    ): Promise<WhatsAppConfig> {
        const updateData: Record<string, unknown> = {};
        if (config.phoneNumberId !== undefined)
            updateData.phoneNumberId = config.phoneNumberId;
        if (config.businessAccountId !== undefined)
            updateData.businessAccountId = config.businessAccountId;
        if (config.accessToken !== undefined)
            updateData.accessToken = config.accessToken;
        if (config.webhookVerifyToken !== undefined)
            updateData.webhookVerifyToken = config.webhookVerifyToken;
        if (config.enabled !== undefined) updateData.enabled = config.enabled;
        if (config.notificationsEnabled !== undefined)
            updateData.notificationsEnabled = config.notificationsEnabled;
        if (config.botEnabled !== undefined)
            updateData.botEnabled = config.botEnabled;
        if (config.templates !== undefined)
            updateData.templates = toJsonInput(config.templates);
        if (config.botConfig !== undefined)
            updateData.botConfig = toJsonInput(config.botConfig);

        try {
            const updatedConfig = await this.prisma.whatsAppConfig.update({
                where: { tenantId },
                data: updateData,
            });
            return this.mapToEntity(updatedConfig);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("WhatsAppConfig", tenantId);
            }
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target =
                    (error.meta?.target as string[])?.[0] ?? "tenantId";
                throw new DuplicateEntityError(
                    "WhatsAppConfig",
                    target,
                    tenantId,
                );
            }
            throw error;
        }
    }

    async delete(tenantId: string): Promise<void> {
        try {
            await this.prisma.whatsAppConfig.delete({
                where: { tenantId },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("WhatsAppConfig", tenantId);
            }
            throw error;
        }
    }
}
