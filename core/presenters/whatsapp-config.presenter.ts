import { WhatsAppConfig } from "@/core/entities/whatsapp-config.entity";
import {
    WhatsAppConfigResponse,
    IWhatsAppConfigResponse,
} from "@/core/application/dtos/responses/whatsapp/whatsapp-config.response";

export class WhatsAppConfigPresenter {
    static toResponse(
        config: WhatsAppConfig,
        maskTokens: boolean = true,
    ): IWhatsAppConfigResponse {
        return WhatsAppConfigResponse.fromEntity(config, maskTokens);
    }
}
