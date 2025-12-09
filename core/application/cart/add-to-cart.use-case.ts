import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { IProductRepository } from '@/core/repositories/product.repository.interface';

export class AddToCartUseCase {
    constructor(
        private cartRepository: ICartRepository,
        private productRepository: IProductRepository
    ) { }

    async execute(userId: string, productId: string, amount: number) {
        let cart = await this.cartRepository.findByUserIdSimple(userId);

        if (!cart) {
            // Lazy creation: Create cart if it doesn't exist
            cart = await this.cartRepository.create(userId);
        }

        // Check if product exists and get stock information
        const product = await this.productRepository.findById(productId);
        if (!product) {
            return {
                success: false,
                code: 404,
                message: "Product not found",
                data: null
            };
        }

        // Check if product already exists in cart
        const existingItem = cart.items.find(item => item.productId === productId);
        const currentQty = existingItem?.amount || 0;
        const newTotalQty = currentQty + amount;

        // Validate total quantity against available stock
        if (product.stock < newTotalQty) {
            const availableToAdd = Math.max(0, product.stock - currentQty);
            return {
                success: false,
                code: 400,
                message: currentQty > 0
                    ? `Cannot add ${amount} items. Only ${availableToAdd} more available (${product.stock} total stock, ${currentQty} already in cart)`
                    : `Insufficient stock. Only ${product.stock} items available`,
                data: {
                    availableToAdd,
                    totalStock: product.stock,
                    currentInCart: currentQty
                }
            };
        }

        if (existingItem) {
            // Update existing item quantity by adding the new amount
            await this.cartRepository.updateItemAmount(cart.id, productId, newTotalQty);
        } else {
            // Add new item with specified quantity
            await this.cartRepository.addItem(cart.id, productId, amount);
        }

        return {
            success: true,
            code: 200,
            message: existingItem
                ? `Updated quantity to ${newTotalQty} items`
                : `Added ${amount} item(s) to cart`,
            data: { totalQuantity: newTotalQty }
        };
    }
}
