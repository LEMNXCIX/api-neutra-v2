import { IOrderRepository } from "@/core/repositories/order.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class GetOrderUseCase {
    constructor(private orderRepository: IOrderRepository) {}

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const order = await this.orderRepository.findById(tenantId, id);
        if (!order) {
            throw new EntityNotFoundError("Order", id);
        }
        return Success(order);
    }
}
