import { Request, Response } from 'express';
import { ICartRepository } from '../../core/repositories/cart.repository.interface';
import { GetCartUseCase } from '../../use-cases/cart/get-cart.use-case';
import { AddToCartUseCase } from '../../use-cases/cart/add-to-cart.use-case';
import { RemoveFromCartUseCase } from '../../use-cases/cart/remove-from-cart.use-case';
import { ClearCartUseCase } from '../../use-cases/cart/clear-cart.use-case';
import { ChangeAmountUseCase } from '../../use-cases/cart/change-amount.use-case';
import { GetCartStatsUseCase } from '../../use-cases/cart/get-cart-stats.use-case';
import { CreateCartUseCase } from '../../use-cases/cart/create-cart.use-case';

export class CartController {
    constructor(private cartRepository: ICartRepository) { }

    getItems = async (req: Request, res: Response) => {
        const { id } = (req as any).user;
        const useCase = new GetCartUseCase(this.cartRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }

    addToCart = async (req: Request, res: Response) => {
        const { id } = (req as any).user;
        const { idProduct, amount } = req.body;
        const useCase = new AddToCartUseCase(this.cartRepository);
        const result = await useCase.execute(id, idProduct, amount);
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
