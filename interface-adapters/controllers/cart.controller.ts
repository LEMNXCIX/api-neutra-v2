import { Request, Response } from "express";
import { GetCartUseCase } from "@/core/application/cart/get-cart.use-case";
import { AddToCartUseCase } from "@/core/application/cart/add-to-cart.use-case";
import { RemoveFromCartUseCase } from "@/core/application/cart/remove-from-cart.use-case";
import { ClearCartUseCase } from "@/core/application/cart/clear-cart.use-case";
import { ChangeAmountUseCase } from "@/core/application/cart/change-amount.use-case";
import { GetCartStatsUseCase } from "@/core/application/cart/get-cart-stats.use-case";
import { CreateCartUseCase } from "@/core/application/cart/create-cart.use-case";
import { CartPresenter } from "@/core/presenters/cart.presenter";
import { present } from "@/core/utils/use-case-result";

export class CartController {
    constructor(
        private getCartUseCase: GetCartUseCase,
        private addToCartUseCase: AddToCartUseCase,
        private createCartUseCase: CreateCartUseCase,
        private removeFromCartUseCase: RemoveFromCartUseCase,
        private changeAmountUseCase: ChangeAmountUseCase,
        private clearCartUseCase: ClearCartUseCase,
        private getCartStatsUseCase: GetCartStatsUseCase,
    ) {}

    getItems = async (req: Request, res: Response) => {
        const { id } = req.user!;
        const tenantId = req.tenantId!;
        const result = await this.getCartUseCase.execute(tenantId, id);
        return res.json(present(result, CartPresenter.toResponse));
    };

    addToCart = async (req: Request, res: Response) => {
        const { id } = req.user!;
        const tenantId = req.tenantId!;
        const { productId, amount } = req.body;
        const result = await this.addToCartUseCase.execute(
            tenantId,
            id,
            productId,
            amount,
        );
        return res.json(present(result, CartPresenter.toResponse));
    };

    create = async (req: Request, res: Response) => {
        const { id } = req.user!;
        const tenantId = req.tenantId!;
        const result = await this.createCartUseCase.execute(tenantId, id);
        return res.status(201).json(present(result, CartPresenter.toResponse));
    };

    removeFromCart = async (req: Request, res: Response) => {
        const { id } = req.user!;
        const tenantId = req.tenantId!;
        const { id: idProduct } = req.body; // Assuming body based on previous fix
        const result = await this.removeFromCartUseCase.execute(
            tenantId,
            id,
            idProduct,
        );
        return res.json(result);
    };

    changeAmount = async (req: Request, res: Response) => {
        const { id } = req.user!;
        const tenantId = req.tenantId!;
        const { idProduct } = req.params;
        const { amount } = req.body;
        const result = await this.changeAmountUseCase.execute(
            tenantId,
            id,
            idProduct,
            amount,
        );
        return res.json(result);
    };

    clearCart = async (req: Request, res: Response) => {
        const { id } = req.user!;
        const tenantId = req.tenantId!;
        const result = await this.clearCartUseCase.execute(tenantId, id);
        return res.json(result);
    };

    getCartsStats = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.getCartStatsUseCase.execute(tenantId);
        return res.json(result);
    };
}
