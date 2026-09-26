import { OrderStatus } from "@/core/entities/order.entity";
import { IsIn, IsOptional, IsString } from "class-validator";

export interface CreateOrderDTO {
    userId: string;
    items: {
        productId: string;
        amount: number;
        price: number;
    }[];
    couponCode?: string;
}

export interface UpdateOrderDTO {
    status?: OrderStatus;
    trackingNumber?: string;
}

export interface ChangeOrderStatusDTO {
    idOrder: string;
    status: OrderStatus;
}

/** `OrderStatus` is a string union, so the members are spelled out once. */
const ORDER_STATUSES = [
    "PENDIENTE",
    "PAGADO",
    "ENVIADO",
    "ENTREGADO",
] as const;

/**
 * The body of `POST /api/order` is `{ couponCode? }` and nothing else.
 *
 * `CreateOrderDTO` still declares `userId` and `items`, and neither is read on
 * this endpoint: `CreateOrderUseCase.execute(tenantId, userId, couponCode)`
 * takes the user from `req.user` and builds `items` from the caller's cart, so
 * a body carrying either would be ignored — or worse, believed. The class
 * therefore does not implement that interface: it describes the wire, and the
 * wire carries one field.
 */
export class CreateOrderDto {
    @IsOptional()
    @IsString()
    couponCode?: string;
}

/** The body of `PUT /api/order/:id`, which is what `UpdateOrderUseCase` reads. */
export class UpdateOrderDto implements UpdateOrderDTO {
    @IsOptional()
    @IsIn(ORDER_STATUSES)
    status?: OrderStatus;

    @IsOptional()
    @IsString()
    trackingNumber?: string;
}

/** The body of `PUT /api/order/changeStatus`. */
export class ChangeOrderStatusDto implements ChangeOrderStatusDTO {
    @IsString()
    idOrder!: string;

    @IsIn(ORDER_STATUSES)
    status!: OrderStatus;
}
