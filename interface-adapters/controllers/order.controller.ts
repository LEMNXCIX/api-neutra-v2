import { Request, Response } from 'express';
import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { CreateOrderUseCase } from '@/use-cases/order/create-order.use-case';
import { GetOrderUseCase } from '@/use-cases/order/get-order.use-case';
import { GetUserOrdersUseCase } from '@/use-cases/order/get-user-orders.use-case';
import { GetAllOrdersUseCase } from '@/use-cases/order/get-all-orders.use-case';
import { ChangeOrderStatusUseCase } from '@/use-cases/order/change-order-status.use-case';
import { GetCartUseCase } from '@/use-cases/cart/get-cart.use-case';
import { ClearCartUseCase } from '@/use-cases/cart/clear-cart.use-case';

export class OrderController {
    private createOrderUseCase: CreateOrderUseCase;
    private getOrderUseCase: GetOrderUseCase;
    private getUserOrdersUseCase: GetUserOrdersUseCase;
    private getAllOrdersUseCase: GetAllOrdersUseCase;
    private changeOrderStatusUseCase: ChangeOrderStatusUseCase;

    constructor(orderRepository: IOrderRepository, cartRepository: ICartRepository) {
        const getCartUseCase = new GetCartUseCase(cartRepository);
        const clearCartUseCase = new ClearCartUseCase(cartRepository);

        this.createOrderUseCase = new CreateOrderUseCase(orderRepository, getCartUseCase, clearCartUseCase);
        this.getOrderUseCase = new GetOrderUseCase(orderRepository);
        this.getUserOrdersUseCase = new GetUserOrdersUseCase(orderRepository);
        this.getAllOrdersUseCase = new GetAllOrdersUseCase(orderRepository);
        this.changeOrderStatusUseCase = new ChangeOrderStatusUseCase(orderRepository);

        // Bind methods
        this.create = this.create.bind(this);
        this.getOne = this.getOne.bind(this);
        this.getByUser = this.getByUser.bind(this);
        this.getAll = this.getAll.bind(this);
        this.changeStatus = this.changeStatus.bind(this);
    }

    async create(req: Request, res: Response) {
        const userId = (req as any).user.id;
        const result = await this.createOrderUseCase.execute(userId);
        return res.json(result);
    }

    async getOne(req: Request, res: Response) {
        const { orderId } = req.body; // Or params, keeping consistent with old route for now
        const result = await this.getOrderUseCase.execute(orderId);
        return res.json(result);
    }

    async getByUser(req: Request, res: Response) {
        const { userId } = req.body; // Or params/user session
        const result = await this.getUserOrdersUseCase.execute(userId);
        return res.json(result);
    }

    async getAll(req: Request, res: Response) {
        const result = await this.getAllOrdersUseCase.execute();
        return res.json(result);
    }

    async changeStatus(req: Request, res: Response) {
        const { idOrder, status } = req.body;
        const result = await this.changeOrderStatusUseCase.execute(idOrder, status);
        return res.json(result);
    }
}
