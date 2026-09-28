import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class ClearCartUseCase {
    constructor(private cartRepository: ICartRepository) {}

    async execute(tenantId: string, userId: string): Promise<UseCaseResult> {
        const cart = await this.cartRepository.findByUserIdSimple(
            tenantId,
            userId,
        );

        if (!cart) {
            throw new EntityNotFoundError("Cart", userId);
        }

        await this.cartRepository.clearItems(tenantId, cart.id);

        return Success({ ...cart, items: [] }, "Cart cleared successfully");
    }
}
