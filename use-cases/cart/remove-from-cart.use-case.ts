import { ICartRepository } from '@/core/repositories/cart.repository.interface';

export class RemoveFromCartUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(userId: string, productId: string) {
        const cart = await this.cartRepository.findByUserIdSimple(userId);

        if (!cart) {
            return {
                success: false,
                code: 404,
                message: "Cart not found",
                data: null
            };
        }

        try {
            await this.cartRepository.removeItem(cart.id, productId);
        } catch (e: any) {
            // Ignore if item not found
        }

        return {
            success: true,
            code: 200,
            message: "Item removed successfully"
        };
    }
}
