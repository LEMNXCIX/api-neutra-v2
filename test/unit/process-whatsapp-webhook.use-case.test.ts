import { ProcessWhatsAppWebhookUseCase } from "@/core/application/whatsapp/process-whatsapp-webhook.use-case";
import { ProcessIncomingMessageUseCase } from "@/core/application/whatsapp/process-incoming-message.use-case";
import { IWhatsAppMessageRepository } from "@/core/repositories/whatsapp-message.repository.interface";

describe("ProcessWhatsAppWebhookUseCase", () => {
    const processIncoming = {
        execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProcessIncomingMessageUseCase;

    const messageRepo = {
        create: jest.fn(),
        findById: jest.fn(),
        findByWaMessageId: jest.fn(),
        findByConversationId: jest.fn(),
        updateStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as IWhatsAppMessageRepository;

    let useCase: ProcessWhatsAppWebhookUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        useCase = new ProcessWhatsAppWebhookUseCase(
            processIncoming,
            messageRepo,
        );
    });

    test("rejects non-whatsapp payloads", async () => {
        const result = await useCase.execute({ object: "other" });
        expect(result).toEqual({
            handled: false,
            reason: "not_whatsapp_event",
        });
        expect(processIncoming.execute).not.toHaveBeenCalled();
    });

    test("forwards incoming messages to ProcessIncomingMessageUseCase", async () => {
        const result = await useCase.execute({
            object: "whatsapp_business_account",
            entry: [
                {
                    changes: [
                        {
                            value: {
                                metadata: { phone_number_id: "123" },
                                messages: [
                                    {
                                        from: "593999",
                                        text: { body: "hola" },
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        });

        expect(result).toEqual({ handled: true });
        expect(processIncoming.execute).toHaveBeenCalledTimes(1);
        expect(processIncoming.execute).toHaveBeenCalledWith(
            expect.objectContaining({
                from: "593999",
                metadata: { phone_number_id: "123" },
            }),
        );
    });

    test("updates message status via repository", async () => {
        const result = await useCase.execute({
            object: "whatsapp_business_account",
            entry: [
                {
                    changes: [
                        {
                            value: {
                                statuses: [
                                    { id: "wamid.1", status: "delivered" },
                                ],
                            },
                        },
                    ],
                },
            ],
        });

        expect(result).toEqual({ handled: true });
        expect(messageRepo.updateStatus).toHaveBeenCalledWith(
            "wamid.1",
            "delivered",
        );
    });
});
