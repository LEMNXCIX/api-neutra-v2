import { ICartRepository } from '@/core/repositories/cart.repository.interface';

export class CreateCartUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(tenantId: string, userId: string) {
        try {
            const cart = await this.cartRepository.create(tenantId, userId);
            return {
                success: true,
                code: 201,
                message: "Cart created successfully",
                data: cart
            };
        } catch (error: any) {
            // We should ideally catch specific errors in Repository and throw Domain Errors
            // But for now we handle P2002 here or assume Repository handles it?
            // The Repository implementation throws Prisma errors directly currently.
            // Let's assume generic error for now or try/catch P2002 if we want to be specific, 
            // but P2002 is Prisma specific. Ideally Repository should return null or throw "CartAlreadyExistsError".
            return {
                success: false,
                code: 500,
                message: "Error creating cart",
                errors: [error.message]
            };
        }
    }
}
