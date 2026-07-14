import { Order } from "@/core/entities/order.entity";
import {
    OrderResponse,
    IOrderResponse,
} from "@/core/application/dtos/responses/order/order.response";

export class OrderPresenter {
    static toResponse(order: Order): IOrderResponse {
        return OrderResponse.fromEntity(order);
    }

    static toResponseList(orders: Order[]): IOrderResponse[] {
        if (!Array.isArray(orders)) return [];
        return orders.map((o) => OrderResponse.fromEntity(o));
    }
}
