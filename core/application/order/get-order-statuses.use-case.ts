import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetOrderStatusesUseCase {
    execute(): UseCaseResult {
        const statuses = [
            { value: "PENDIENTE", label: "Pendiente" },
            { value: "PAGADO", label: "Pagado" },
            { value: "ENVIADO", label: "Enviado" },
            { value: "ENTREGADO", label: "Entregado" },
        ];
        return Success(statuses, "Order statuses retrieved successfully");
    }
}
