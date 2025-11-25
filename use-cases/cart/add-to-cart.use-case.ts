import { ICartRepository } from '@/core/repositories/cart.repository.interface';

export class AddToCartUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(userId: string, productId: string, amount: number) {
        let cart = await this.cartRepository.findByUserIdSimple(userId);

        if (!cart) {
            // Lazy creation: Create cart if it doesn't exist
            cart = await this.cartRepository.create(userId);
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
