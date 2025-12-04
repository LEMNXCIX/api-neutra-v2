import { Request, Response } from 'express';
import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { OrderStatus } from '@/core/entities/order.entity';
import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { CreateOrderUseCase } from '@/core/application/order/create-order.use-case';
import { GetOrderUseCase } from '@/core/application/order/get-order.use-case';
import { GetUserOrdersUseCase } from '@/core/application/order/get-user-orders.use-case';
import { GetAllOrdersUseCase } from '@/core/application/order/get-all-orders.use-case';
import { GetOrdersPaginatedUseCase } from '@/core/application/order/get-orders-paginated.use-case';
import { ChangeOrderStatusUseCase } from '@/core/application/order/change-order-status.use-case';
import { UpdateOrderUseCase } from '@/core/application/order/update-order.use-case';
import { GetOrderStatusesUseCase } from '@/core/application/order/get-order-statuses.use-case';
import { GetCartUseCase } from '@/core/application/cart/get-cart.use-case';
import { ClearCartUseCase } from '@/core/application/cart/clear-cart.use-case';
import { GetOrderStatsUseCase } from '@/core/application/order/get-order-stats.use-case';

import { ILogger } from '@/core/providers/logger.interface';

export class OrderController {
    private createOrderUseCase: CreateOrderUseCase;
    private getOrderUseCase: GetOrderUseCase;
    private getUserOrdersUseCase: GetUserOrdersUseCase;
    private getAllOrdersUseCase: GetAllOrdersUseCase;
    private changeOrderStatusUseCase: ChangeOrderStatusUseCase;
    private updateOrderUseCase: UpdateOrderUseCase;
    private getOrderStatsUseCase: GetOrderStatsUseCase;

    constructor(
        orderRepository: IOrderRepository,
        cartRepository: ICartRepository,
        productRepository: IProductRepository,
        couponRepository: ICouponRepository,
        private logger: ILogger
    ) {
        const getCartUseCase = new GetCartUseCase(cartRepository);
        const clearCartUseCase = new ClearCartUseCase(cartRepository);

        this.createOrderUseCase = new CreateOrderUseCase(orderRepository, getCartUseCase, clearCartUseCase, productRepository, couponRepository, logger);
        this.getOrderUseCase = new GetOrderUseCase(orderRepository);
        this.getUserOrdersUseCase = new GetUserOrdersUseCase(orderRepository);
        this.getAllOrdersUseCase = new GetAllOrdersUseCase(orderRepository);
        this.changeOrderStatusUseCase = new ChangeOrderStatusUseCase(orderRepository, logger);
        this.updateOrderUseCase = new UpdateOrderUseCase(orderRepository, logger);
        this.getOrderStatsUseCase = new GetOrderStatsUseCase(orderRepository);

        // Bind methods
        this.create = this.create.bind(this);
        this.getOne = this.getOne.bind(this);
        this.getOneById = this.getOneById.bind(this);
        this.getByUser = this.getByUser.bind(this);
        this.getAll = this.getAll.bind(this);
        this.changeStatus = this.changeStatus.bind(this);
        this.update = this.update.bind(this);
        this.getStatuses = this.getStatuses.bind(this);
        this.getStats = this.getStats.bind(this);
    }

    async getStats(req: Request, res: Response) {
        this.logger.info('Get Order Stats Request', { userId: (req as any).user?.id });

        const result = await this.getOrderStatsUseCase.execute();
        return res.json(result);
    }

    async getStatuses(req: Request, res: Response) {
        this.logger.info('Get Order Statuses Request', { userId: (req as any).user?.id });

        const useCase = new GetOrderStatusesUseCase();
        const result = useCase.execute();
        return res.json(result);
    }

    async create(req: Request, res: Response) {
        this.logger.logRequest({ method: req.method, url: req.originalUrl, body: req.body, headers: req.headers });
        this.logger.info('Create Order Request', { userId: (req as any).user?.id });

        const userId = (req as any).user.id;
        const { couponId } = req.body;
        const result = await this.createOrderUseCase.execute(userId, couponId);
        return res.json(result);
    }

    async getOne(req: Request, res: Response) {
        this.logger.info('Get One Order Request', { userId: (req as any).user?.id, body: req.body, query: req.query });

        const { orderId } = req.body; // Or params, keeping consistent with old route for now
        const result = await this.getOrderUseCase.execute(orderId);
        return res.json(result);
    }

    async getOneById(req: Request, res: Response) {
        this.logger.info('Get One Order By ID Request', { userId: (req as any).user?.id, params: req.params });

        const { id } = req.params;
        const result = await this.getOrderUseCase.execute(id);
        return res.json(result);
    }

    async getByUser(req: Request, res: Response) {
        this.logger.info('Get User Orders Request', { userId: (req as any).user?.id, query: req.query });

        const userId = (req as any).user.id;
        const status = req.query.status as OrderStatus | undefined;
        const result = await this.getUserOrdersUseCase.execute(userId, status);
        return res.json(result);
    }

    async getAll(req: Request, res: Response) {
        this.logger.info('Get All Orders Request', { userId: (req as any).user?.id, query: req.query });

        // Check if pagination/filtering query params are present
        const { search, status, page, limit } = req.query;

        if (page || limit || search || status) {
            // Use paginated endpoint
            const useCase = new GetOrdersPaginatedUseCase(this.getAllOrdersUseCase['orderRepository']);
            const result = await useCase.execute({
                search: search as string,
                status: status as string,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined
            });
            return res.json(result);
        } else {
            // Use original endpoint for backward compatibility
            const result = await this.getAllOrdersUseCase.execute();
            return res.json(result);
        }
    }

    async changeStatus(req: Request, res: Response) {
        this.logger.info('Change Status Request', {
            userId: (req as any).user?.id,
            body: req.body,
            extracted: {
                idOrder: req.body.idOrder,
                status: req.body.status
            }
        });

        const { idOrder, status } = req.body;
        const result = await this.changeOrderStatusUseCase.execute(idOrder, status);
        return res.json(result);
    }

    async update(req: Request, res: Response) {
        this.logger.info('Update Order Request', {
            userId: (req as any).user?.id,
            params: req.params,
            body: req.body,
            orderId: req.params.id
        });

        const { id } = req.params;
        const result = await this.updateOrderUseCase.execute(id, req.body);
        return res.json(result);
    }
}
