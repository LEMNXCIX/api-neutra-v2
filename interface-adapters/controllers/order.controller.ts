import { Request, Response } from "express";
import { OrderStatus } from "@/core/entities/order.entity";
import { CreateOrderUseCase } from "@/core/application/order/create-order.use-case";
import { GetOrderUseCase } from "@/core/application/order/get-order.use-case";
import { GetUserOrdersUseCase } from "@/core/application/order/get-user-orders.use-case";
import { GetOrdersPaginatedUseCase } from "@/core/application/order/get-orders-paginated.use-case";
import { ChangeOrderStatusUseCase } from "@/core/application/order/change-order-status.use-case";
import { UpdateOrderUseCase } from "@/core/application/order/update-order.use-case";
import { GetOrderStatusesUseCase } from "@/core/application/order/get-order-statuses.use-case";
import { GetOrderStatsUseCase } from "@/core/application/order/get-order-stats.use-case";
import { OrderPresenter } from "@/core/presenters/order.presenter";
import { present } from "@/core/utils/use-case-result";

export class OrderController {
    constructor(
        private createOrderUseCase: CreateOrderUseCase,
        private getOrderUseCase: GetOrderUseCase,
        private getUserOrdersUseCase: GetUserOrdersUseCase,
        private getOrdersPaginatedUseCase: GetOrdersPaginatedUseCase,
        private changeOrderStatusUseCase: ChangeOrderStatusUseCase,
        private updateOrderUseCase: UpdateOrderUseCase,
        private getOrderStatusesUseCase: GetOrderStatusesUseCase,
        private getOrderStatsUseCase: GetOrderStatsUseCase,
    ) {
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
        const tenantId = req.tenantId!;
        const startDate = req.query.startDate
            ? new Date(req.query.startDate as string)
            : undefined;
        const endDate = req.query.endDate
            ? new Date(req.query.endDate as string)
            : undefined;

        const result = await this.getOrderStatsUseCase.execute(
            tenantId,
            startDate,
            endDate,
        );
        return res.json(result);
    }

    async getStatuses(req: Request, res: Response) {
        const result = this.getOrderStatusesUseCase.execute();
        return res.json(result);
    }

    async create(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const userId = req.user!.id;
        const { couponId } = req.body;
        const result = await this.createOrderUseCase.execute(
            tenantId,
            userId,
            couponId,
        );
        return res.status(201).json(present(result, OrderPresenter.toResponse));
    }

    async getOne(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { orderId } = req.body;
        const result = await this.getOrderUseCase.execute(tenantId, orderId);
        return res.json(present(result, OrderPresenter.toResponse));
    }

    async getOneById(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.getOrderUseCase.execute(tenantId, id);
        return res.json(present(result, OrderPresenter.toResponse));
    }

    async getByUser(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const userId = req.user!.id;
        const status = req.query.status as OrderStatus | undefined;
        const result = await this.getUserOrdersUseCase.execute(
            tenantId,
            userId,
            status,
        );
        return res.json(present(result, OrderPresenter.toResponseList));
    }

    async getAll(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { search, status, page, limit } = req.query;

        // Always paginated: unbounded list endpoints are a memory/DoS risk.
        const parsedPage = page ? parseInt(page as string) : 1;
        const parsedLimit = limit ? parseInt(limit as string) : 50;
        const result = await this.getOrdersPaginatedUseCase.execute(
            tenantId,
            {
                search: search as string,
                status: status as string,
                page: Math.max(1, parsedPage),
                limit: Math.min(100, Math.max(1, parsedLimit)),
                startDate: req.query.startDate
                    ? new Date(req.query.startDate as string)
                    : undefined,
                endDate: req.query.endDate
                    ? new Date(req.query.endDate as string)
                    : undefined,
            },
        );
        return res.json(present(result, OrderPresenter.toResponseList));
    }

    async changeStatus(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { idOrder, status } = req.body;
        const result = await this.changeOrderStatusUseCase.execute(
            tenantId,
            idOrder,
            status,
        );
        return res.json(present(result, OrderPresenter.toResponse));
    }

    async update(req: Request, res: Response) {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateOrderUseCase.execute(
            tenantId,
            id,
            req.body,
        );
        return res.json(present(result, OrderPresenter.toResponse));
    }
}
