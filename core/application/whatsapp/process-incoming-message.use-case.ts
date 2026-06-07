import {
    IWhatsAppBotService,
    IncomingWhatsAppMessage,
} from "@/core/ports/whatsapp-bot-service.interface";
import { IWhatsAppConfigRepository } from "@/core/repositories/whatsapp-config.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    ValidationError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

export class ProcessIncomingMessageUseCase {
    constructor(
        private whatsappBotService: IWhatsAppBotService,
        private whatsappConfigRepository: IWhatsAppConfigRepository,
    ) {}

    async execute(
        messagePayload: IncomingWhatsAppMessage,
    ): Promise<UseCaseResult<void>> {
        const metadata = messagePayload.metadata as
            | Record<string, unknown>
            | undefined;
        const phoneNumberId = metadata?.phone_number_id as string | undefined;

        if (!phoneNumberId) {
            throw new ValidationError(
                "Missing phone_number_id in webhook metadata",
                "WHATSAPP_CONFIG_NOT_FOUND",
            );
        }

        const config =
            await this.whatsappConfigRepository.findByPhoneNumberId(
                phoneNumberId,
            );

        if (!config) {
            throw new EntityNotFoundError("WhatsApp config", phoneNumberId);
        }

        const tenantId = config.tenantId;

        await this.whatsappBotService.processIncomingMessage(
            messagePayload,
            tenantId,
        );

        return Success(undefined, "Message processed successfully");
    }
}
