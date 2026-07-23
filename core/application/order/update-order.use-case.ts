import { IOrderRepository, OrderUpdateData } from "@/core/repositories/order.repository.interface";
import { UpdateOrderDTO } from "@/core/application/dtos/requests/order.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class UpdateOrderUseCase {
    constructor(private orderRepository: IOrderRepository) {}

    async execute(
        tenantId: string,
        id: string,
        data: UpdateOrderDTO,
    ): Promise<UseCaseResult> {
        const updateData: OrderUpdateData = { status: data.status, trackingNumber: data.trackingNumber };
        const order = await this.orderRepository.update(tenantId, id, updateData);
        return Success(order, "Order updated successfully");
    }
}
