import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes, ValidationErrorCodes } from '@/types/error-codes';

export class ChangeAmountUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(tenantId: string, userId: string, productId: string, amount: number): Promise<UseCaseResult> {
        if (typeof amount !== 'number' || amount < 1) {
            throw new AppError("Amount must be a positive number", 400, ValidationErrorCodes.INVALID_DATA_TYPE);
        }

        const cart = await this.cartRepository.findByUserIdSimple(tenantId, userId);

        if (!cart) {
            throw new AppError("Cart not found", 404, ResourceErrorCodes.NOT_FOUND);
        }

        try {
            await this.cartRepository.updateItemAmount(tenantId, cart.id, productId, amount);
        } catch (error: any) {
            throw new AppError("Item not found in cart", 404, ResourceErrorCodes.NOT_FOUND);
        }

        return Success(null, "Amount updated successfully");
    }
}
