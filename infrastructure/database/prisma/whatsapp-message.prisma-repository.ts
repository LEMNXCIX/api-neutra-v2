import { PrismaClient } from '@prisma/client';
import { IWhatsAppMessageRepository } from '@/core/repositories/whatsapp-message.repository.interface';
import { WhatsAppMessage } from '@/core/entities/whatsapp-message.entity';

export class WhatsAppMessagePrismaRepository implements IWhatsAppMessageRepository {
    constructor(private prisma: PrismaClient) { }

    async create(message: Omit<WhatsAppMessage, "id" | "createdAt" | "updatedAt">): Promise<WhatsAppMessage> {
        const newMessage = await this.prisma.whatsAppMessage.create({
            data: {
                ...message,
                content: message.content ?? {}
            }
        });
        return newMessage as unknown as WhatsAppMessage;
    }

    async findById(id: string): Promise<WhatsAppMessage | null> {
        const message = await this.prisma.whatsAppMessage.findUnique({
            where: { id }
        });
        return (message as unknown as WhatsAppMessage) || null;
    }

    async findByWaMessageId(waMessageId: string): Promise<WhatsAppMessage | null> {
        const message = await this.prisma.whatsAppMessage.findUnique({
            where: { waMessageId }
        });
        return (message as unknown as WhatsAppMessage) || null;
    }

    async findByConversationId(conversationId: string): Promise<WhatsAppMessage[]> {
        const messages = await this.prisma.whatsAppMessage.findMany({
            where: { waConversationId: conversationId }
        });
        return messages as unknown as WhatsAppMessage[];
    }

    async updateStatus(waMessageId: string, status: string): Promise<void> {
        await this.prisma.whatsAppMessage.update({
            where: { waMessageId },
            data: { status }
        });
    }
}
