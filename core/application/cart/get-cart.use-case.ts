import { ICartRepository } from '@/core/repositories/cart.repository.interface';

export class GetCartUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(userId: string) {
        const cart = await this.cartRepository.findByUserId(userId);

        if (!cart) {
            return {
                success: false,
                code: 404,
                message: "Cart not found",
                data: null
            };
        }

        const products = cart.items.map((item) => ({
            ...item.product,
            amount: item.amount,
        }));

        return {
            success: true,
            code: 200,
            message: products.length ? "Cart items retrieved successfully" : "Cart is empty",
            data: products
        };
    }
}
