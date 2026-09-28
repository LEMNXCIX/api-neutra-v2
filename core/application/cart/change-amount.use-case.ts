import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import type { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class ChangeAmountUseCase {
    constructor(private cartRepository: ICartRepository) {}

    async execute(
        tenantId: string,
        userId: string,
        productId: string,
        amount: number,
    ): Promise<UseCaseResult> {
        if (typeof amount !== "number" || amount < 1) {
            throw new ValidationError("Amount must be a positive number");
        }

        const cart = await this.cartRepository.findByUserIdSimple(
            tenantId,
            userId,
        );

        if (!cart) {
            throw new EntityNotFoundError("Cart", userId);
        }

        try {
            await this.cartRepository.updateItemAmount(
                tenantId,
                cart.id,
                productId,
                amount,
            );
        } catch (_error: unknown) {
            throw new EntityNotFoundError("CartItem", productId);
        }

        return Success(null, "Amount updated successfully");
    }
}
