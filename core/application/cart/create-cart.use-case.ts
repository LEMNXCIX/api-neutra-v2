import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class CreateCartUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute(tenantId: string, userId: string): Promise<UseCaseResult> {
        const cart = await this.cartRepository.create(tenantId, userId);
        return Success(cart, "Cart created successfully");
    }
}
