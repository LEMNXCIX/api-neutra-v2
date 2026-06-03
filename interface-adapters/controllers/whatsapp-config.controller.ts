import { Request, Response } from "express";
import { ConfigureWhatsAppUseCase } from "@/core/application/whatsapp/configure-whatsapp.use-case";
import { IWhatsAppConfigRepository } from "@/core/repositories/whatsapp-config.repository.interface";
import { WhatsAppConfigPresenter } from "@/core/presenters/whatsapp-config.presenter";
import { Success } from "@/core/utils/use-case-result";

export class WhatsAppConfigController {
    constructor(
        private configureWhatsAppUseCase: ConfigureWhatsAppUseCase,
        private whatsappConfigRepo: IWhatsAppConfigRepository,
    ) {}

    async getConfig(req: Request, res: Response) {
        const tenantId = req.headers["x-tenant-id"] as string;
        if (!tenantId) {
            return res
                .status(400)
                .json({ success: false, message: "Tenant ID is required" });
        }

        const config = await this.whatsappConfigRepo.findByTenantId(tenantId);
        if (!config) {
            return res.json({});
        }

        const data = WhatsAppConfigPresenter.toResponse(config, true);
        return res.json(Success(data));
    }

    async updateConfig(req: Request, res: Response) {
        const tenantId = req.headers["x-tenant-id"] as string;
        if (!tenantId) {
            return res
                .status(400)
                .json({ success: false, message: "Tenant ID is required" });
        }

        const updatedConfig = await this.configureWhatsAppUseCase.execute(
            tenantId,
            req.body,
        );
        const data = WhatsAppConfigPresenter.toResponse(updatedConfig, true);
        return res.json(Success(data, "WhatsApp config updated successfully"));
    }
}
