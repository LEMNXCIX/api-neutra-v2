import { OrderStatus } from "@/core/entities/order.entity";

export interface IOrderItemResponse {
    id: string;
    orderId: string;
    productId: string;
    amount: number;
    price: number;
    product?: {
        name: string;
        image: string | null;
        price: number;
    };
}

export interface IOrderUserResponse {
    name: string;
    email: string;
}

export interface IOrderResponse {
    id: string;
    userId: string;
    status: OrderStatus;
    items: IOrderItemResponse[];
    subtotal: number;
    total: number;
    discountAmount: number;
    couponId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    user?: IOrderUserResponse;
    trackingNumber?: string | null;
}

export class OrderResponse {
    static fromEntity(order: any): IOrderResponse {
        return {
            id: order.id,
            userId: order.userId,
            status: order.status,
            items: order.items?.map((item: any) => ({
                id: item.id,
                orderId: item.orderId,
                productId: item.productId,
                amount: item.amount,
                price: item.price,
                product: item.product
                    ? {
                          name: item.product.name,
                          image: item.product.image ?? null,
                          price: item.product.price,
                      }
                    : undefined,
            })),
            subtotal: order.subtotal,
            total: order.total,
            discountAmount: order.discountAmount,
            couponId: order.couponId ?? null,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            user: order.user
                ? { name: order.user.name, email: order.user.email }
                : undefined,
            trackingNumber: order.trackingNumber ?? null,
        };
    }
}
