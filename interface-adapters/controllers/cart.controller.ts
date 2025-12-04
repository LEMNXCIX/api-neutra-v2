import { Request, Response } from 'express';
import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { GetCartUseCase } from '@/core/application/cart/get-cart.use-case';
import { AddToCartUseCase } from '@/core/application/cart/add-to-cart.use-case';
import { RemoveFromCartUseCase } from '@/core/application/cart/remove-from-cart.use-case';
import { ClearCartUseCase } from '@/core/application/cart/clear-cart.use-case';
import { ChangeAmountUseCase } from '@/core/application/cart/change-amount.use-case';
import { GetCartStatsUseCase } from '@/core/application/cart/get-cart-stats.use-case';
import { CreateCartUseCase } from '@/core/application/cart/create-cart.use-case';

export class CartController {
    constructor(
        private cartRepository: ICartRepository,
        private productRepository: IProductRepository
    ) { }

    getItems = async (req: Request, res: Response) => {
        const { id } = (req as any).user;
        const useCase = new GetCartUseCase(this.cartRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }

    addToCart = async (req: Request, res: Response) => {
        const { id } = (req as any).user;
        const { productId, amount } = req.body;
        const useCase = new AddToCartUseCase(this.cartRepository, this.productRepository);
        const result = await useCase.execute(id, productId, amount);
        return res.status(result.code).json(result);
    }

    create = async (req: Request, res: Response) => {
        const { id } = (req as any).user;
        const useCase = new CreateCartUseCase(this.cartRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }

    removeFromCart = async (req: Request, res: Response) => {
        const { id } = (req as any).user;
        const { id: idProduct } = req.body; // Assuming body based on previous fix
        const useCase = new RemoveFromCartUseCase(this.cartRepository);
        const result = await useCase.execute(id, idProduct);
        return res.status(result.code).json(result);
    }

    changeAmount = async (req: Request, res: Response) => {
        const { id } = (req as any).user;
        const { idProduct } = req.params;
        const { amount } = req.body;
        const useCase = new ChangeAmountUseCase(this.cartRepository);
        const result = await useCase.execute(id, idProduct, amount);
        return res.status(result.code).json(result);
    }

    clearCart = async (req: Request, res: Response) => {
        const { id } = (req as any).user;
        const useCase = new ClearCartUseCase(this.cartRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }

    getCartsStats = async (req: Request, res: Response) => {
        const useCase = new GetCartStatsUseCase(this.cartRepository);
        const result = await useCase.execute();
        return res.status(result.code).json(result);
    }
}
