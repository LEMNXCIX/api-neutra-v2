import { IWhatsAppService } from "@/core/ports/whatsapp-service.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { SendNotificationDTO } from "@/core/application/dtos/requests/whatsapp.request";
import { ValidationError } from "@/core/domain/errors/domain-errors";

export class SendNotificationUseCase {
    constructor(private whatsappService: IWhatsAppService) {}

    async execute(data: SendNotificationDTO): Promise<UseCaseResult<string>> {
        if (!data.tenantId) {
            throw new ValidationError(
                "Tenant ID required",
                "MISSING_REQUIRED_FIELDS",
            );
        }
        if (!data.to || !data.templateName) {
            throw new ValidationError(
                "Missing required fields: to, templateName",
                "MISSING_REQUIRED_FIELDS",
            );
        }

        const {
            tenantId,
            to,
            templateName,
            languageCode = "es",
            components = [],
        } = data;

        const messageId = await this.whatsappService.sendTemplateMessage(
            to,
            templateName,
            languageCode,
            components,
            tenantId,
        );

        return Success(messageId, "Template message sent successfully");
    }
}
