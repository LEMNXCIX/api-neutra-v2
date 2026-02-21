import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class GetCartUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(tenantId: string, userId: string): Promise<UseCaseResult> {
        const cart = await this.cartRepository.findByUserId(tenantId, userId);

        if (!cart) {
            throw new AppError("Cart not found", 404, ResourceErrorCodes.NOT_FOUND);
        }

        const products = cart.items.map((item) => ({
            ...item.product,
            amount: item.amount,
        }));

        return Success(products, products.length ? "Cart items retrieved successfully" : "Cart is empty");
    }
}
