import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { IOrderRepository } from "@/core/repositories/order.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

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
