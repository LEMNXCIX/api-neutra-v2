import { Request, Response } from "express";
import { GetWhatsAppConfigUseCase } from "@/core/application/whatsapp/get-whatsapp-config.use-case";
import { ConfigureWhatsAppUseCase } from "@/core/application/whatsapp/configure-whatsapp.use-case";
import { WhatsAppConfigResponse } from "@/core/application/dtos/responses/whatsapp/whatsapp-config.response";
import { present } from "@/core/utils/use-case-result";

export class WhatsAppConfigController {
    constructor(
        private getWhatsAppConfigUseCase: GetWhatsAppConfigUseCase,
        private configureWhatsAppUseCase: ConfigureWhatsAppUseCase,
    ) {}

    async getConfig(req: Request, res: Response) {
        const tenantId = req.tenantId!;

        const result = await this.getWhatsAppConfigUseCase.execute(tenantId);
        return res.json(
            present(result, (data) =>
                WhatsAppConfigResponse.fromEntity(data, true),
            ),
        );
    }

    async updateConfig(req: Request, res: Response) {
        const tenantId = req.tenantId!;

        const result = await this.configureWhatsAppUseCase.execute(
            tenantId,
            req.body,
        );
        return res.json(
            present(result, (data) =>
                WhatsAppConfigResponse.fromEntity(data, true),
            ),
        );
    }
}
