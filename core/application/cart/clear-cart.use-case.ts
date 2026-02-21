import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class ClearCartUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(tenantId: string, userId: string): Promise<UseCaseResult> {
        const cart = await this.cartRepository.findByUserIdSimple(tenantId, userId);

        if (!cart) {
            throw new AppError("Cart not found", 404, ResourceErrorCodes.NOT_FOUND);
        }

        await this.cartRepository.clearItems(tenantId, cart.id);

        return Success({ ...cart, items: [] }, "Cart cleared successfully");
    }
}
