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

        // Check if product exists and has sufficient stock
        const product = await this.productRepository.findById(productId);
        if (!product) {
            return {
                success: false,
                code: 404,
                message: "Product not found",
                data: null
            };
        }

        if (product.stock < amount) {
            return {
                success: false,
                code: 400,
                message: `Insufficient stock. Available: ${product.stock}`,
                data: null
            };
        }

        const productExists = cart.items.some(item => item.productId === productId);

        if (productExists) {
            return {
                success: false,
                code: 409,
                message: "Product already exists in cart",
                data: null
            };
        }

        await this.cartRepository.addItem(cart.id, productId, amount);

        // Reuse GetCart logic or return simple success
        // For now, let's just return success to avoid circular dependency or duplication
        // Ideally, we call GetCartUseCase here, but let's keep it simple.
        return {
            success: true,
            code: 200,
            message: "Item added successfully"
        };
    }
}
