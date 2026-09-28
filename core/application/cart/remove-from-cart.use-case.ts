import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { ILogger } from "@/core/providers/logger.interface";
import type { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class RemoveFromCartUseCase {
    constructor(
        private cartRepository: ICartRepository,
        private logger: ILogger,
    ) {}

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
        } catch (error: unknown) {
            // Removing something that is not in the cart is not a failure, so
            // the result stays successful. It was previously discarded without a
            // trace, which made a real storage fault indistinguishable from a
            // harmless no-op. ILogger.warn has no dedicated error parameter, so
            // the error is carried inside the metadata.
            this.logger.warn("Cart item could not be removed", {
                error,
                tenantId,
                userId,
                cartId: cart.id,
                productId,
            });
        }

        return Success(null, "Item removed successfully");
    }
}
