import { IOrderRepository } from "@/core/repositories/order.repository.interface";
import { UpdateOrderDTO } from "@/core/application/dtos/requests/order.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class UpdateOrderUseCase {
    constructor(private orderRepository: IOrderRepository) {}

    async execute(
        tenantId: string,
        id: string,
        data: UpdateOrderDTO,
    ): Promise<UseCaseResult> {
        const order = await this.orderRepository.update(tenantId, id, data);
        return Success(order, "Order updated successfully");
    }
}
