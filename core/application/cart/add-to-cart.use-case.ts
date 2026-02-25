import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes, BusinessErrorCodes } from '@/types/error-codes';

export class AddToCartUseCase {
    constructor(
        private cartRepository: ICartRepository,
        private productRepository: IProductRepository
    ) { }

    async execute(tenantId: string, userId: string, productId: string, amount: number): Promise<UseCaseResult> {
        let cart = await this.cartRepository.findByUserIdSimple(tenantId, userId);

        if (!cart) {
            cart = await this.cartRepository.create(tenantId, userId);
        }

        const product = await this.productRepository.findById(tenantId, productId);
        if (!product) {
            throw new AppError("Product not found", 404, ResourceErrorCodes.NOT_FOUND);
        }

        const existingItem = cart.items.find(item => item.productId === productId);
        const currentQty = existingItem?.amount || 0;
        const newTotalQty = currentQty + amount;

        if (product.stock < newTotalQty) {
            const availableToAdd = Math.max(0, product.stock - currentQty);
            const message = currentQty > 0
                ? `Cannot add ${amount} items. Only ${availableToAdd} more available (${product.stock} total stock, ${currentQty} already in cart)`
                : `Insufficient stock. Only ${product.stock} items available`;
            
            throw new AppError(message, 400, BusinessErrorCodes.INSUFFICIENT_STOCK, [
                { code: BusinessErrorCodes.INSUFFICIENT_STOCK, message, metadata: { availableToAdd, totalStock: product.stock, currentInCart: currentQty } }
            ]);
        }

        if (existingItem) {
            await this.cartRepository.updateItemAmount(tenantId, cart.id, productId, newTotalQty);
        } else {
            await this.cartRepository.addItem(tenantId, cart.id, productId, amount);
        }

        return Success({ totalQuantity: newTotalQty }, existingItem ? `Updated quantity to ${newTotalQty} items` : `Added ${amount} item(s) to cart`);
    }
}
