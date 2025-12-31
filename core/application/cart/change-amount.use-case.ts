import { ICartRepository } from '@/core/repositories/cart.repository.interface';

export class ChangeAmountUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(tenantId: string, userId: string, productId: string, amount: number) {
        if (typeof amount !== 'number' || amount < 1) {
            return {
                success: false,
                code: 400,
                message: "Invalid amount",
                errors: ["Amount must be a positive number"]
            };
        }

        const cart = await this.cartRepository.findByUserIdSimple(tenantId, userId);

        if (!cart) {
            return {
                success: false,
                code: 404,
                message: "Cart not found",
                data: null
            };
        }

        try {
            await this.cartRepository.updateItemAmount(tenantId, cart.id, productId, amount);
        } catch (error: any) {
            return {
                success: false,
                code: 404,
                message: "Item not found in cart",
                data: null
            };
        }

        return {
            success: true,
            code: 200,
            message: "Amount updated successfully"
        };
    }
}
