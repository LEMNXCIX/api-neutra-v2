import { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class RemoveFromCartUseCase {
    constructor(private cartRepository: ICartRepository) {}

    async execute(
        tenantId: string,
        userId: string,
        productId: string,
    ): Promise<UseCaseResult> {
        const cart = await this.cartRepository.findByUserIdSimple(
            tenantId,
            userId,
        );

        if (!cart) {
            throw new EntityNotFoundError("Cart", userId);
        }

        try {
            await this.cartRepository.removeItem(tenantId, cart.id, productId);
        } catch (e: unknown) {
            // Ignore if item not found or throw if you want strictness
        }

        return Success(null, "Item removed successfully");
    }
}
