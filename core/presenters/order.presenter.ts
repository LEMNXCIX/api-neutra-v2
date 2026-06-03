import {
    OrderResponse,
    IOrderResponse,
} from "@/core/application/dtos/responses/order/order.response";

export class OrderPresenter {
    static toResponse(order: any): IOrderResponse {
        return OrderResponse.fromEntity(order);
    }

    static toResponseList(orders: any[]): IOrderResponse[] {
        return orders.map((o) => OrderResponse.fromEntity(o));
    }
}
