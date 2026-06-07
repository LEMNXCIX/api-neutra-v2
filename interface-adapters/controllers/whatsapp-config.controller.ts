import { Request, Response } from "express";
import { GetWhatsAppConfigUseCase } from "@/core/application/whatsapp/get-whatsapp-config.use-case";
import { ConfigureWhatsAppUseCase } from "@/core/application/whatsapp/configure-whatsapp.use-case";
import { WhatsAppConfigPresenter } from "@/core/presenters/whatsapp-config.presenter";
import { present } from "@/core/utils/use-case-result";

export class WhatsAppConfigController {
    constructor(
        private getWhatsAppConfigUseCase: GetWhatsAppConfigUseCase,
        private configureWhatsAppUseCase: ConfigureWhatsAppUseCase,
    ) {}

    async getConfig(req: Request, res: Response) {
        const tenantId = req.headers["x-tenant-id"] as string;

        const result = await this.getWhatsAppConfigUseCase.execute(tenantId);
        return res.json(
            present(result, (data) =>
                WhatsAppConfigPresenter.toResponse(data, true),
            ),
        );
    }

    async updateConfig(req: Request, res: Response) {
        const tenantId = req.headers["x-tenant-id"] as string;

        const result = await this.configureWhatsAppUseCase.execute(
            tenantId,
            req.body,
        );
        return res.json(
            present(result, (data) =>
                WhatsAppConfigPresenter.toResponse(data, true),
            ),
        );
    }
}
