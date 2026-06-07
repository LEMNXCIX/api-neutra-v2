import { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

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
