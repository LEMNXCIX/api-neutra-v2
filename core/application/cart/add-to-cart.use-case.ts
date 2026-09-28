import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import { assertCartStockAvailable } from "@/core/domain/order/order.policy";
import type { ICartRepository } from "@/core/repositories/cart.repository.interface";
import type { IProductRepository } from "@/core/repositories/product.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class AddToCartUseCase {
    constructor(
        private cartRepository: ICartRepository,
        private productRepository: IProductRepository,
    ) {}

    async execute(
        tenantId: string,
        userId: string,
        productId: string,
        amount: number,
    ): Promise<UseCaseResult> {
        let cart = await this.cartRepository.findByUserIdSimple(
            tenantId,
            userId,
        );

        if (!cart) {
            cart = await this.cartRepository.create(tenantId, userId);
        }

        const product = await this.productRepository.findById(
            tenantId,
            productId,
        );
        if (!product) {
            throw new EntityNotFoundError("Product", productId);
        }

        const existingItem = cart.items.find(
            (item) => item.productId === productId,
        );
        const currentQty = existingItem?.amount || 0;
        const newTotalQty = currentQty + amount;

        assertCartStockAvailable({
            stock: product.stock,
            cartQuantity: currentQty,
            requestedQuantity: amount,
            totalQuantity: newTotalQty,
        });

        if (existingItem) {
            await this.cartRepository.updateItemAmount(
                tenantId,
                cart.id,
                productId,
                newTotalQty,
            );
        } else {
            await this.cartRepository.addItem(
                tenantId,
                cart.id,
                productId,
                amount,
            );
        }

        return Success(
            { totalQuantity: newTotalQty },
            existingItem
                ? `Updated quantity to ${newTotalQty} items`
                : `Added ${amount} item(s) to cart`,
        );
    }
}
