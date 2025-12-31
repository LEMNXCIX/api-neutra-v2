import { PrismaClient } from '@prisma/client';
import { IWhatsAppConversationRepository } from '@/core/repositories/whatsapp-conversation.repository.interface';
import { WhatsAppConversation } from '@/core/entities/whatsapp-conversation.entity';

export class WhatsAppConversationPrismaRepository implements IWhatsAppConversationRepository {
    constructor(private prisma: PrismaClient) { }

    async create(conversation: Omit<WhatsAppConversation, "id" | "createdAt" | "updatedAt">): Promise<WhatsAppConversation> {
        const newConversation = await this.prisma.whatsAppConversation.create({
            data: {
                ...conversation,
                context: conversation.context ?? undefined
            }
        });
        return newConversation as unknown as WhatsAppConversation;
    }

    async findByWaConversationId(waConversationId: string): Promise<WhatsAppConversation | null> {
        const conversation = await this.prisma.whatsAppConversation.findUnique({
            where: { waConversationId }
        });
        return (conversation as unknown as WhatsAppConversation) || null;
    }

    async findByPhoneNumber(tenantId: string, phoneNumber: string): Promise<WhatsAppConversation | null> {
        // Busca la conversación activa más reciente o simplemente la última por usuario
        // Suponiendo una relación 1:1 activa por simplicidad o busqueda simple
        const conversation = await this.prisma.whatsAppConversation.findFirst({
            where: { tenantId, phoneNumber },
            orderBy: { updatedAt: 'desc' }
        });
        return (conversation as unknown as WhatsAppConversation) || null;
    }

    async updateContext(id: string, context: any): Promise<void> {
        await this.prisma.whatsAppConversation.update({
            where: { id },
            data: { context }
        });
    }

    async updateStatus(id: string, status: string): Promise<void> {
        await this.prisma.whatsAppConversation.update({
            where: { id },
            data: { status }
        });
    }
}
