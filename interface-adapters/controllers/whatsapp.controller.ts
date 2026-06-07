import { Request, Response } from "express";
import { SendNotificationUseCase } from "@/core/application/whatsapp/send-notification.use-case";

export class WhatsAppController {
    constructor(private sendNotificationUseCase: SendNotificationUseCase) {}

    async sendTemplate(req: Request, res: Response) {
        const tenantId = req.headers["x-tenant-id"] as string;
        const { to, templateName, languageCode, components } = req.body;

        const result = await this.sendNotificationUseCase.execute({
            tenantId,
            to,
            templateName,
            languageCode,
            components,
        });

        return res.status(200).json(result);
    }
}
