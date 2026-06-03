import {
    WhatsAppConfigResponse,
    IWhatsAppConfigResponse,
} from "@/core/application/dtos/responses/whatsapp/whatsapp-config.response";

export class WhatsAppConfigPresenter {
    static toResponse(
        config: any,
        maskTokens: boolean = true,
    ): IWhatsAppConfigResponse {
        return WhatsAppConfigResponse.fromEntity(config, maskTokens);
    }
}
