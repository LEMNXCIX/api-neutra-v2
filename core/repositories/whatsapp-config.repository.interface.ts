import { WhatsAppConfig } from "../entities/whatsapp-config.entity";

export interface IWhatsAppConfigRepository {
    findByTenantId(tenantId: string): Promise<WhatsAppConfig | null>;
    findByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppConfig | null>;
    create(config: Omit<WhatsAppConfig, "id" | "createdAt" | "updatedAt">): Promise<WhatsAppConfig>;
    update(tenantId: string, config: Partial<WhatsAppConfig>): Promise<WhatsAppConfig>;
    delete(tenantId: string): Promise<void>;
}
