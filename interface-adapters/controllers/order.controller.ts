import type { Request, Response } from "express";
import type {
    DatedQueryDto,
    OrderListQueryDto,
    OrderStatusQueryDto,
} from "@/core/application/dtos/requests/list-query.dto";
import type {
    ChangeOrderStatusDto,
    UpdateOrderDTO,
} from "@/core/application/dtos/requests/order.request";
import { OrderResponse } from "@/core/application/dtos/responses/order/order.response";
import type { ChangeOrderStatusUseCase } from "@/core/application/order/change-order-status.use-case";
import type { CreateOrderUseCase } from "@/core/application/order/create-order.use-case";
import type { GetOrderUseCase } from "@/core/application/order/get-order.use-case";
import type { GetOrderStatsUseCase } from "@/core/application/order/get-order-stats.use-case";
import type { GetOrderStatusesUseCase } from "@/core/application/order/get-order-statuses.use-case";
import type { GetOrdersPaginatedUseCase } from "@/core/application/order/get-orders-paginated.use-case";
import type { GetUserOrdersUseCase } from "@/core/application/order/get-user-orders.use-case";
import type { UpdateOrderUseCase } from "@/core/application/order/update-order.use-case";
import type { OrderStatus } from "@/core/entities/order.entity";
import { parsePagination } from "@/core/utils/pagination";
import { present } from "@/core/utils/use-case-result";
import { currentUser, tenantIdOf } from "@/helpers/request-context.helpers";

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
        const tenantId = tenantIdOf(req);
        const query = (req.validatedQuery ?? {}) as DatedQueryDto;
        const startDate = query.startDate
            ? new Date(query.startDate)
            : undefined;
        const endDate = query.endDate ? new Date(query.endDate) : undefined;

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
        const tenantId = tenantIdOf(req);
        const userId = currentUser(req).id;
        const { couponCode } = req.body;
        const result = await this.createOrderUseCase.execute(
            tenantId,
            userId,
            couponCode,
        );
        return res.status(201).json(present(result, OrderResponse.fromEntity));
    }

    async getOne(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const { orderId } = req.body;
        const result = await this.getOrderUseCase.execute(tenantId, orderId);
        return res.json(present(result, OrderResponse.fromEntity));
    }

    async getOneById(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;
        const result = await this.getOrderUseCase.execute(tenantId, id);
        return res.json(present(result, OrderResponse.fromEntity));
    }

    async getByUser(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const userId = currentUser(req).id;
        const status = ((req.validatedQuery ?? {}) as OrderStatusQueryDto)
            .status as OrderStatus | undefined;
        const result = await this.getUserOrdersUseCase.execute(
            tenantId,
            userId,
            status,
        );
        return res.json(
            present(result, (orders) =>
                Array.isArray(orders)
                    ? orders.map((o) => OrderResponse.fromEntity(o))
                    : [],
            ),
        );
    }

    async getAll(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const query = (req.validatedQuery ?? {}) as OrderListQueryDto;

        // Always paginated: unbounded list endpoints are a memory/DoS risk.
        // Orders keep their historical default of 50 (other lists use 10).
        const { page, limit } = parsePagination(query, { defaultLimit: 50 });
        const result = await this.getOrdersPaginatedUseCase.execute(tenantId, {
            search: query.search,
            status: query.status,
            page,
            limit,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
        });
        return res.json(
            present(result, (orders) =>
                Array.isArray(orders)
                    ? orders.map((o) => OrderResponse.fromEntity(o))
                    : [],
            ),
        );
    }

    async changeStatus(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const { idOrder, status } = req.validatedBody as ChangeOrderStatusDto;
        const result = await this.changeOrderStatusUseCase.execute(
            tenantId,
            idOrder,
            status,
        );
        return res.json(present(result, OrderResponse.fromEntity));
    }

    async update(req: Request, res: Response) {
        const tenantId = tenantIdOf(req);
        const { id } = req.params;
        const result = await this.updateOrderUseCase.execute(
            tenantId,
            id,
            req.validatedBody as UpdateOrderDTO,
        );
        return res.json(present(result, OrderResponse.fromEntity));
    }
}
