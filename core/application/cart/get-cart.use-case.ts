import { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class GetCartUseCase {
    constructor(private cartRepository: ICartRepository) {}

    async execute(tenantId: string, userId: string): Promise<UseCaseResult> {
        const cart = await this.cartRepository.findByUserId(tenantId, userId);

        if (!cart) {
            throw new EntityNotFoundError("Cart", userId);
        }

        const products = cart.items.map((item) => ({
            ...item.product,
            amount: item.amount,
        }));

        return Success(
            products,
            products.length
                ? "Cart items retrieved successfully"
                : "Cart is empty",
        );
    }
}
