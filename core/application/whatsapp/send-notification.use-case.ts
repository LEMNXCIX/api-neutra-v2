import type { SendNotificationDTO } from "@/core/application/dtos/requests/whatsapp.request";
import { ValidationError } from "@/core/domain/errors/domain-errors";
import type { IWhatsAppService } from "@/core/ports/whatsapp-service.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";
import { ValidationErrorCodes } from "@/types/error-codes";

export class SendNotificationUseCase {
    constructor(private whatsappService: IWhatsAppService) {}

    async execute(data: SendNotificationDTO): Promise<UseCaseResult<string>> {
        if (!data.tenantId) {
            throw new ValidationError(
                "Tenant ID required",
                ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
            );
        }
        if (!data.to || !data.templateName) {
            throw new ValidationError(
                "Missing required fields: to, templateName",
                ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
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
