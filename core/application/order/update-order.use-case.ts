import type { UpdateOrderDTO } from "@/core/application/dtos/requests/order.request";
import type { ChangeOrderStatusUseCase } from "@/core/application/order/change-order-status.use-case";
import type { IOrderRepository } from "@/core/repositories/order.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class UpdateOrderUseCase {
    constructor(
        private orderRepository: IOrderRepository,
        private changeOrderStatusUseCase: ChangeOrderStatusUseCase,
    ) {}

    async execute(
        tenantId: string,
        id: string,
        data: UpdateOrderDTO,
    ): Promise<UseCaseResult> {
        if (data.status !== undefined) {
            return this.changeOrderStatusUseCase.execute(
                tenantId,
                id,
                data.status,
                data.trackingNumber,
            );
        }

        const order = await this.orderRepository.update(tenantId, id, {
            trackingNumber: data.trackingNumber,
        });
        return Success(order, "Order updated successfully");
    }
}
