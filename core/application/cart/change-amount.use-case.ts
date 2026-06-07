import { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";

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
        } catch (error: unknown) {
            throw new EntityNotFoundError("CartItem", productId);
        }

        return Success(null, "Amount updated successfully");
    }
}
