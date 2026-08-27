// HTTP adapter for Meta webhooks
process.env.NODE_ENV = "development";

if (!process.env.WHATSAPP_VERIFY_TOKEN) {
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-me";
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WhatsAppWebhookController } = require(
    "@/infrastructure/webhooks/whatsapp-webhook.controller"
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: config } = require("@/config/index.config");
// The config module is a shared singleton cached across test files; it may
// have been loaded earlier with WHATSAPP_VERIFY_TOKEN unset (CI). The
// controller reads config.whatsappVerifyToken at call time, so set it here.
if (!config.whatsappVerifyToken) {
    config.whatsappVerifyToken = "verify-me";
}
const VALID_TOKEN = config.whatsappVerifyToken;

function createRes() {
    const res: Record<string, unknown> = {};
    res.status = jest.fn((code: number) => {
        res.statusCode = code;
        return res;
    });
    res.json = jest.fn((body: unknown) => res);
    res.send = jest.fn((body: unknown) => res);
    return res;
}

function setup(useCaseResult?: { handled: boolean }) {
    const processWhatsAppWebhookUseCase = {
        execute: jest.fn().mockResolvedValue(useCaseResult ?? { handled: true }),
    };
    const controller = new WhatsAppWebhookController(processWhatsAppWebhookUseCase as never);
    return { controller, processWhatsAppWebhookUseCase };
}

describe("WhatsAppWebhookController.verify (GET)", () => {
    test("echoes challenge on valid token", async () => {
        const { controller } = setup();
        const res = createRes();
        await controller.verify(
            { query: { "hub.mode": "subscribe", "hub.verify_token": VALID_TOKEN, "hub.challenge": "12345" } } as never,
            res as never,
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith("12345");
    });

    test("403 on wrong token", async () => {
        const { controller } = setup();
        const res = createRes();
        await controller.verify(
            { query: { "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "1" } } as never,
            res as never,
        );

        expect(res.status).toHaveBeenCalledWith(403);
    });

    test("400 on missing mode/token", async () => {
        const { controller } = setup();
        const res = createRes();
        await controller.verify({ query: {} } as never, res as never);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test("400 on non-numeric challenge", async () => {
        const { controller } = setup();
        const res = createRes();
        await controller.verify(
            { query: { "hub.mode": "subscribe", "hub.verify_token": VALID_TOKEN, "hub.challenge": "abc" } } as never,
            res as never,
        );

        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("WhatsAppWebhookController.handleWebhook (POST)", () => {
    test("200 EVENT_RECEIVED when handled", async () => {
        const { controller, processWhatsAppWebhookUseCase } = setup({ handled: true });
        const res = createRes();
        await controller.handleWebhook({ body: { field: "messages" } } as never, res as never);

        expect(processWhatsAppWebhookUseCase.execute).toHaveBeenCalledWith({ field: "messages" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith("EVENT_RECEIVED");
    });

    test("404 when not a WhatsApp event", async () => {
        const { controller } = setup({ handled: false });
        const res = createRes();
        await controller.handleWebhook({ body: {} } as never, res as never);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test("500 and logged when processing throws", async () => {
        const { controller, processWhatsAppWebhookUseCase } = setup();
        processWhatsAppWebhookUseCase.execute.mockRejectedValue(new Error("boom"));
        const res = createRes();
        await controller.handleWebhook({ body: {} } as never, res as never);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

export {};
