import {
    WhatsAppMessage as PrismaWhatsAppMessage,
    Prisma,
} from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { IWhatsAppMessageRepository } from "@/core/repositories/whatsapp-message.repository.interface";
import {
    WhatsAppMessage,
    WhatsAppMessageType,
    WhatsAppMessageStatus,
    WhatsAppMessageDirection,
    WhatsAppMessageContent,
} from "@/core/entities/whatsapp-message.entity";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

function parseContent(value: Prisma.JsonValue | null): WhatsAppMessageContent {
    if (value === null || value === undefined) return {};
    if (typeof value === "object" && !Array.isArray(value))
        return value as WhatsAppMessageContent;
    return {};
}

export class WhatsAppMessagePrismaRepository implements IWhatsAppMessageRepository {
    constructor(private prisma: PrismaClient) {}

    private mapToEntity(data: PrismaWhatsAppMessage): WhatsAppMessage {
        return {
            id: data.id,
            tenantId: data.tenantId,
            waMessageId: data.waMessageId,
            waConversationId: data.waConversationId,
            from: data.from,
            to: data.to,
            type: data.type as WhatsAppMessageType,
            content: parseContent(data.content),
            status: data.status as WhatsAppMessageStatus,
            direction: data.direction as WhatsAppMessageDirection,
            userId: data.userId,
            appointmentId: data.appointmentId,
            orderId: data.orderId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    }

    async create(
        message: Omit<WhatsAppMessage, "id" | "createdAt" | "updatedAt">,
    ): Promise<WhatsAppMessage> {
        try {
            const newMessage = await this.prisma.whatsAppMessage.create({
                data: {
                    tenantId: message.tenantId,
                    waMessageId: message.waMessageId,
                    waConversationId: message.waConversationId,
                    from: message.from,
                    to: message.to,
                    type: message.type,
                    content: message.content as Prisma.InputJsonValue,
                    status: message.status,
                    direction: message.direction,
                    userId: message.userId,
                    appointmentId: message.appointmentId,
                    orderId: message.orderId,
                },
            });
            return this.mapToEntity(newMessage);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target =
                    (error.meta?.target as string[])?.[0] ?? "waMessageId";
                throw new DuplicateEntityError(
                    "WhatsAppMessage",
                    target,
                    message.waMessageId,
                );
            }
            throw error;
        }
    }

    async findById(id: string): Promise<WhatsAppMessage | null> {
        const message = await this.prisma.whatsAppMessage.findUnique({
            where: { id },
        });
        return message ? this.mapToEntity(message) : null;
    }

    async findByWaMessageId(
        waMessageId: string,
    ): Promise<WhatsAppMessage | null> {
        const message = await this.prisma.whatsAppMessage.findUnique({
            where: { waMessageId },
        });
        return message ? this.mapToEntity(message) : null;
    }

    async findByConversationId(
        conversationId: string,
    ): Promise<WhatsAppMessage[]> {
        const messages = await this.prisma.whatsAppMessage.findMany({
            where: { waConversationId: conversationId },
        });
        return messages.map(this.mapToEntity);
    }

    async updateStatus(waMessageId: string, status: string): Promise<void> {
        try {
            await this.prisma.whatsAppMessage.update({
                where: { waMessageId },
                data: { status },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("WhatsAppMessage", waMessageId);
            }
            throw error;
        }
    }
}
