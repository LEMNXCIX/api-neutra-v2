import { ICartRepository } from '@/core/repositories/cart.repository.interface';

export class ClearCartUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(tenantId: string, userId: string) {
        const cart = await this.cartRepository.findByUserIdSimple(tenantId, userId);

        if (!cart) {
            return {
                success: false,
                code: 404,
                message: "Cart not found",
                data: null
            };
        }

        await this.cartRepository.clearItems(tenantId, cart.id);

        return {
            success: true,
            code: 200,
            message: "Cart cleared successfully",
            data: { ...cart, items: [] }
        };
    }
}
