import { PrismaClient } from '@prisma/client';
import { IWhatsAppConfigRepository } from '@/core/repositories/whatsapp-config.repository.interface';
import { WhatsAppConfig } from '@/core/entities/whatsapp-config.entity';

export class WhatsAppConfigPrismaRepository implements IWhatsAppConfigRepository {
    constructor(private prisma: PrismaClient) { }

    async findByTenantId(tenantId: string): Promise<WhatsAppConfig | null> {
        const config = await this.prisma.whatsAppConfig.findUnique({
            where: { tenantId }
        });

        if (!config) return null;

        return {
            ...config,
            templates: config.templates,
            botConfig: config.botConfig
        } as WhatsAppConfig;
    }

    async findByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppConfig | null> {
        const config = await this.prisma.whatsAppConfig.findFirst({
            where: { phoneNumberId }
        });

        if (!config) return null;

        return {
            ...config,
            templates: config.templates,
            botConfig: config.botConfig
        } as WhatsAppConfig;
    }

    async create(config: Omit<WhatsAppConfig, "id" | "createdAt" | "updatedAt">): Promise<WhatsAppConfig> {
        const newConfig = await this.prisma.whatsAppConfig.create({
            data: {
                ...config,
                templates: config.templates ?? undefined,
                botConfig: config.botConfig ?? undefined
            }
        });

        return {
            ...newConfig,
            templates: newConfig.templates,
            botConfig: newConfig.botConfig
        } as WhatsAppConfig;
    }

    async update(tenantId: string, config: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
        const updatedConfig = await this.prisma.whatsAppConfig.update({
            where: { tenantId },
            data: {
                ...config,
                templates: config.templates ?? undefined,
                botConfig: config.botConfig ?? undefined
            }
        });

        return {
            ...updatedConfig,
            templates: updatedConfig.templates,
            botConfig: updatedConfig.botConfig
        } as WhatsAppConfig;
    }

    async delete(tenantId: string): Promise<void> {
        await this.prisma.whatsAppConfig.delete({
            where: { tenantId }
        });
    }
}
