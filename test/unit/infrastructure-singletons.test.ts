import fs from "node:fs";
import path from "node:path";

import { createEmailService } from "@/infrastructure/services/email.service";
import { createNotificationService } from "@/infrastructure/services/notification.service";
import { EmailProvider } from "@/infrastructure/providers/email.notification.provider";
import { WhatsAppProvider } from "@/infrastructure/providers/whatsapp.provider";
import { PushProvider } from "@/infrastructure/providers/push.provider";
import { SendNotificationUseCase } from "@/core/application/whatsapp/send-notification.use-case";
import type { IEmailService } from "@/core/ports/email.port";
import type { ILogger } from "@/core/providers/logger.interface";
import type { IWhatsAppService } from "@/core/ports/whatsapp-service.interface";

const ROOT = path.resolve(__dirname, "../..");

const createLogger = (): ILogger =>
    ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        logRequest: jest.fn(),
        logResponse: jest.fn(),
    }) as unknown as ILogger;

const createEmailServiceMock = (): jest.Mocked<IEmailService> =>
    ({
        sendEmail: jest.fn().mockResolvedValue(true),
        sendWelcomeEmail: jest.fn().mockResolvedValue(true),
        sendOrderConfirmation: jest.fn().mockResolvedValue(true),
        sendPasswordReset: jest.fn().mockResolvedValue(true),
        sendAppointmentConfirmation: jest.fn().mockResolvedValue(true),
        sendAppointmentReminder: jest.fn().mockResolvedValue(true),
        sendAppointmentCancellation: jest.fn().mockResolvedValue(true),
    }) as unknown as jest.Mocked<IEmailService>;

const createWhatsAppServiceMock = (): jest.Mocked<IWhatsAppService> =>
    ({
        sendTextMessage: jest.fn().mockResolvedValue("text-message-id"),
        sendTemplateMessage: jest
            .fn()
            .mockResolvedValue("template-message-id"),
    }) as unknown as jest.Mocked<IWhatsAppService>;

describe("email service factory", () => {
    it("builds a usable email service on demand without a shared instance", () => {
        const first = createEmailService(createLogger());
        const second = createEmailService(createLogger());

        expect(first).not.toBe(second);
        expect(typeof first.sendEmail).toBe("function");
        expect(typeof first.sendAppointmentConfirmation).toBe("function");
    });
});

describe("notification service factory", () => {
    it("routes each channel to the injected provider and skips unknown ones", async () => {
        const email = new EmailProvider(createEmailServiceMock(), createLogger());
        const push = new PushProvider();

        const notification = createNotificationService([email, push]);

        expect(notification).not.toBe(createNotificationService([email, push]));
        await expect(
            notification.notify(
                ["EMAIL", "PUSH", "WHATSAPP"],
                {
                    EMAIL: "user@example.com",
                    PUSH: "device-token",
                },
                { body: "hello" },
            ),
        ).resolves.toBeUndefined();
    });
});

describe("EmailProvider with injected dependencies", () => {
    it("forwards the message to the injected email service and logs", async () => {
        const emailService = createEmailServiceMock();
        const logger = createLogger();
        const provider = new EmailProvider(emailService, logger);
        const attachments = [
            { filename: "a.ics", content: "ics", contentType: "text/calendar" },
        ];

        const sent = await provider.send(
            "user@example.com",
            { subject: "Cita", body: "Confirmada", templateId: "tpl", attachments },
        );

        expect(sent).toBe(true);
        expect(emailService.sendEmail).toHaveBeenCalledWith(
            "user@example.com",
            "Cita",
            "tpl",
            { body: "Confirmada" },
            undefined,
            attachments,
        );
        expect(logger.info).toHaveBeenCalledWith("Sending email", {
            recipient: "user@example.com",
            subject: "Cita",
        });
        expect(provider.getChannelName()).toBe("EMAIL");
    });

    it("returns false and logs the failure when the email service throws", async () => {
        const emailService = createEmailServiceMock();
        emailService.sendEmail.mockRejectedValue(new Error("smtp down"));
        const logger = createLogger();
        const provider = new EmailProvider(emailService, logger);

        await expect(
            provider.send("user@example.com", { body: "no subject" }),
        ).resolves.toBe(false);
        expect(logger.error).toHaveBeenCalledWith(
            "Error sending email",
            expect.any(Error),
        );
    });
});

describe("WhatsAppProvider with injected dependencies", () => {
    it("sends template messages through the injected use case", async () => {
        const whatsappService = createWhatsAppServiceMock();
        const logger = createLogger();
        const provider = new WhatsAppProvider(
            whatsappService,
            new SendNotificationUseCase(whatsappService),
            logger,
        );

        const sent = await provider.send(
            "+573001234567",
            { body: "hola", templateId: "appointment_confirmed" },
            { tenantId: "tenant-1" },
        );

        expect(sent).toBe(true);
        expect(whatsappService.sendTemplateMessage).toHaveBeenCalledWith(
            "+573001234567",
            "appointment_confirmed",
            "es",
            [],
            "tenant-1",
        );
        expect(provider.getChannelName()).toBe("WHATSAPP");
    });

    it("falls back to a text message when no template is provided", async () => {
        const whatsappService = createWhatsAppServiceMock();
        const provider = new WhatsAppProvider(
            whatsappService,
            new SendNotificationUseCase(whatsappService),
            createLogger(),
        );

        await expect(
            provider.send(
                "+573001234567",
                { body: "hola" },
                { tenantId: "tenant-1" },
            ),
        ).resolves.toBe(true);
        expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
            "+573001234567",
            "hola",
            "tenant-1",
        );
    });

    it("rejects a send without tenantId and swallows upstream failures", async () => {
        const whatsappService = createWhatsAppServiceMock();
        const logger = createLogger();
        const provider = new WhatsAppProvider(
            whatsappService,
            new SendNotificationUseCase(whatsappService),
            logger,
        );

        await expect(
            provider.send("+573001234567", { body: "hola" }),
        ).resolves.toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            "[WhatsAppProvider] Missing tenantId in options. Cannot send WhatsApp message.",
        );

        whatsappService.sendTextMessage.mockRejectedValue(new Error("meta down"));
        await expect(
            provider.send(
                "+573001234567",
                { body: "hola" },
                { tenantId: "tenant-1" },
            ),
        ).resolves.toBe(false);
        expect(logger.error).toHaveBeenCalledWith(
            "[WhatsAppProvider] Error sending WhatsApp message: meta down",
        );
    });
});

describe("infrastructure composition has no module-level singletons", () => {
    const ownedSources = [
        "infrastructure/services/email.service.ts",
        "infrastructure/services/notification.service.ts",
        "infrastructure/providers/email.notification.provider.ts",
        "infrastructure/providers/whatsapp.provider.ts",
        "infrastructure/config/runtime.ts",
        "infrastructure/workers/notification.worker.ts",
        "infrastructure/providers/logger.instance.ts",
    ];

    it.each(ownedSources)("%s exports factories, not instances", (file) => {
        const source = fs.readFileSync(path.join(ROOT, file), "utf8");

        expect(source).not.toMatch(
            /export\s+const\s+\w+\s*=\s*new\s+\w/,
        );
        expect(source).not.toMatch(/private\s+static\s+instance/);
    });

    it("exposes an instance-free logger factory", () => {
        const source = fs.readFileSync(
            path.join(ROOT, "infrastructure/providers/logger.instance.ts"),
            "utf8",
        );

        expect(source).toContain("export function createLogger");
        expect(source).not.toMatch(/export\s+const\s+logger\s*=/);
    });

    it("keeps the legacy helper instance-free", () => {
        const source = fs.readFileSync(
            path.join(ROOT, "helpers/logger.helpers.ts"),
            "utf8",
        );

        expect(source).toContain("export function createLoggerHelpers");
        expect(source).not.toMatch(
            /^const\s+logger\s*=\s*pino\(transport\);/m,
        );
        expect(source).not.toMatch(/^const\s+transport\s*=/m);
    });

    it("keeps runtime and application sources free of the helper logger", () => {
        for (const file of [
            "infrastructure/config/runtime.ts",
            "infrastructure/providers/pino-logger.provider.ts",
            "infrastructure/providers/redis.provider.ts",
            "middleware/optional-authenticate.factory.ts",
            "infrastructure/services/whatsapp.service.ts",
            "infrastructure/services/whatsapp-bot.service.ts",
            "app.ts",
        ]) {
            const source = fs.readFileSync(path.join(ROOT, file), "utf8");
            expect(source).not.toMatch(/helpers\/logger\.helpers/);
        }
    });

    it("keeps the provider modules free of global imports", () => {
        for (const file of [
            "infrastructure/providers/email.notification.provider.ts",
            "infrastructure/providers/whatsapp.provider.ts",
        ]) {
            const source = fs.readFileSync(path.join(ROOT, file), "utf8");

            expect(source).not.toMatch(/logger\.instance/);
            expect(source).not.toMatch(/services\/email\.service/);
            expect(source).not.toMatch(/services\/notification\.service/);
            expect(source).not.toMatch(/config\/db\.config/);
            expect(source).not.toMatch(/prisma-repository/);
        }
    });
});
