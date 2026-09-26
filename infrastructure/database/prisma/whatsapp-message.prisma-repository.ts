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

/**
 * type/status/direction are free-form String columns in the schema, so unlike
 * the Prisma enums they can genuinely hold a value the domain does not model.
 * The mapper proves membership before narrowing and throws on anything else,
 * rather than labelling an unknown value as a known one. The write side is not
 * yet validated (see updateStatus), so this throw is reachable.
 */
const MESSAGE_TYPES: readonly WhatsAppMessageType[] = [
    "text",
    "image",
    "document",
    "audio",
    "video",
    "template",
    "interactive",
    "location",
    "sticker",
    "contacts",
];

const MESSAGE_STATUSES: readonly WhatsAppMessageStatus[] = [
    "sent",
    "delivered",
    "read",
    "failed",
    "pending",
];

const MESSAGE_DIRECTIONS: readonly WhatsAppMessageDirection[] = [
    "inbound",
    "outbound",
];

function isMessageType(value: string): value is WhatsAppMessageType {
    return (MESSAGE_TYPES as string[]).includes(value);
}

function toMessageType(value: string): WhatsAppMessageType {
    if (!isMessageType(value)) {
        throw new Error(`Unsupported WhatsApp message type: ${value}`);
    }
    return value;
}

function isMessageStatus(value: string): value is WhatsAppMessageStatus {
    return (MESSAGE_STATUSES as string[]).includes(value);
}

function toMessageStatus(value: string): WhatsAppMessageStatus {
    if (!isMessageStatus(value)) {
        throw new Error(`Unsupported WhatsApp message status: ${value}`);
    }
    return value;
}

function isMessageDirection(value: string): value is WhatsAppMessageDirection {
    return (MESSAGE_DIRECTIONS as string[]).includes(value);
}

function toMessageDirection(value: string): WhatsAppMessageDirection {
    if (!isMessageDirection(value)) {
        throw new Error(`Unsupported WhatsApp message direction: ${value}`);
    }
    return value;
}

/**
 * Every WhatsAppMessageContent field is a string, a string[] or a plain
 * object, so each stored entry is checked against that shape instead of being
 * cast. A value of any other JSON type would violate the domain type, and it
 * is rejected rather than passed off as a valid field.
 */
function isContentValue(value: unknown): boolean {
    if (typeof value === "string") return true;
    if (Array.isArray(value)) {
        return value.every((entry) => typeof entry === "string");
    }
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseContent(value: Prisma.JsonValue | null): WhatsAppMessageContent {
    if (value === null || value === undefined) return {};
    if (typeof value !== "object" || Array.isArray(value)) return {};
    for (const [key, entry] of Object.entries(value)) {
        if (!isContentValue(entry)) {
            throw new Error(
                `Unsupported WhatsApp message content at "${key}"`,
            );
        }
    }
    // SAFETY: every entry was checked above to be a string, a string[] or a
    // plain object, which is exactly the union of shapes
    // WhatsAppMessageContent allows; only the key names remain unproven.
    return value as unknown as WhatsAppMessageContent;
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
            type: toMessageType(data.type),
            content: parseContent(data.content),
            status: toMessageStatus(data.status),
            direction: toMessageDirection(data.direction),
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
