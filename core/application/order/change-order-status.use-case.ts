import { IOrderRepository } from "@/core/repositories/order.repository.interface";
import { OrderStatus, canTransitionTo } from "@/core/entities/order.entity";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { InvalidStateError } from "@/core/domain/errors/domain-errors";

export class ChangeOrderStatusUseCase {
    constructor(private orderRepository: IOrderRepository) {}

    async execute(
        tenantId: string,
        id: string,
        status: string,
    ): Promise<UseCaseResult> {
        const validStatuses: OrderStatus[] = [
            "PENDIENTE",
            "PAGADO",
            "ENVIADO",
            "ENTREGADO",
        ];
        if (!validStatuses.includes(status as OrderStatus)) {
            throw new InvalidStateError(
                `'${status}' is not a valid order status`,
            );
        }

        const order = await this.orderRepository.findById(tenantId, id);
        if (!order) {
            throw new InvalidStateError(`Order '${id}' not found`);
        }

        if (!canTransitionTo(order.status, status as OrderStatus)) {
            throw new InvalidStateError(
                `Order cannot transition from '${order.status}' to '${status}'`,
                "INVALID_STATUS_TRANSITION",
            );
        }

        const updated = await this.orderRepository.updateStatus(
            tenantId,
            id,
            status as OrderStatus,
        );
        return Success(updated, "Order status updated");
    }
}
