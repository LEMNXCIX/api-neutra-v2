import { ICartRepository } from '@/core/repositories/cart.repository.interface';

export class GetCartStatsUseCase {
    constructor(private cartRepository: ICartRepository) { }

    async execute() {
        const result: any[] = await this.cartRepository.getStats();

        const data = result.map(r => ({
            _id: r.yearMonth,
            total: r.total
        }));

        return {
            success: true,
            code: 200,
            message: "Cart statistics retrieved successfully",
            data: data
        };
    }
}
