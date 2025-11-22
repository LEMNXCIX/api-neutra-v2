import { ICartRepository } from '../../core/repositories/cart.repository.interface';

export class AddToCartUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(userId: string, productId: string, amount: number) {
        const cart = await this.cartRepository.findByUserIdSimple(userId);

        if (!cart) {
            return {
                success: false,
                code: 404,
                message: "Cart not found",
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
