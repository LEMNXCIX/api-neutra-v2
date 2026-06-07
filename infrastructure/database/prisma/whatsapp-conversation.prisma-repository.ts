import {
    WhatsAppConversation as PrismaWhatsAppConversation,
    Prisma,
} from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { IWhatsAppConversationRepository } from "@/core/repositories/whatsapp-conversation.repository.interface";
import { WhatsAppConversation } from "@/core/entities/whatsapp-conversation.entity";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

function parseContext(
    value: Prisma.JsonValue | null,
): Record<string, unknown> | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "object" && !Array.isArray(value))
        return value as Record<string, unknown>;
    return undefined;
}

export class WhatsAppConversationPrismaRepository implements IWhatsAppConversationRepository {
    constructor(private prisma: PrismaClient) {}

    private mapToEntity(
        data: PrismaWhatsAppConversation,
    ): WhatsAppConversation {
        return {
            id: data.id,
            tenantId: data.tenantId,
            waConversationId: data.waConversationId,
            phoneNumber: data.phoneNumber,
            userId: data.userId,
            status: data.status,
            context: parseContext(data.context),
            lastMessageAt: data.lastMessageAt,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    }

    async create(
        conversation: Omit<
            WhatsAppConversation,
            "id" | "createdAt" | "updatedAt"
        >,
    ): Promise<WhatsAppConversation> {
        try {
            const newConversation =
                await this.prisma.whatsAppConversation.create({
                    data: {
                        tenantId: conversation.tenantId,
                        waConversationId: conversation.waConversationId,
                        phoneNumber: conversation.phoneNumber,
                        userId: conversation.userId,
                        status: conversation.status,
                        context: conversation.context as
                            | Prisma.InputJsonValue
                            | undefined,
                        lastMessageAt: conversation.lastMessageAt,
                    },
                });
            return this.mapToEntity(newConversation);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target =
                    (error.meta?.target as string[])?.[0] ?? "waConversationId";
                throw new DuplicateEntityError(
                    "WhatsAppConversation",
                    target,
                    conversation.waConversationId,
                );
            }
            throw error;
        }
    }

    async findByWaConversationId(
        waConversationId: string,
    ): Promise<WhatsAppConversation | null> {
        const conversation = await this.prisma.whatsAppConversation.findUnique({
            where: { waConversationId },
        });
        return conversation ? this.mapToEntity(conversation) : null;
    }

    async findByPhoneNumber(
        tenantId: string,
        phoneNumber: string,
    ): Promise<WhatsAppConversation | null> {
        const conversation = await this.prisma.whatsAppConversation.findFirst({
            where: { tenantId, phoneNumber },
            orderBy: { updatedAt: "desc" },
        });
        return conversation ? this.mapToEntity(conversation) : null;
    }

    async updateContext(
        id: string,
        context: Record<string, unknown>,
    ): Promise<void> {
        try {
            await this.prisma.whatsAppConversation.update({
                where: { id },
                data: { context: context as Prisma.InputJsonValue },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("WhatsAppConversation", id);
            }
            throw error;
        }
    }

    async updateStatus(id: string, status: string): Promise<void> {
        try {
            await this.prisma.whatsAppConversation.update({
                where: { id },
                data: { status },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("WhatsAppConversation", id);
            }
            throw error;
        }
    }
}
