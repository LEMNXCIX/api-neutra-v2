import type { Request, Response } from "express";
import type { SendNotificationDto } from "@/core/application/dtos/requests/whatsapp.request";
import type { SendNotificationUseCase } from "@/core/application/whatsapp/send-notification.use-case";

export class WhatsAppController {
    constructor(private sendNotificationUseCase: SendNotificationUseCase) {}

    async sendTemplate(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        // `tenantId` is the authenticated context, not a body field: it is
        // spread last, so a body naming another tenant cannot redirect the
        // message. The DTO does not declare it at all.
        const { to, templateName, languageCode, components } =
            req.validatedBody as SendNotificationDto;

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
