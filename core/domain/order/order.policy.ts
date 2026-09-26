import { Order, OrderStatus } from "@/core/entities/order.entity";

export function canTransitionTo(
    current: OrderStatus,
    next: OrderStatus,
): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
        PENDIENTE: ["PAGADO"],
        PAGADO: ["ENVIADO"],
        ENVIADO: ["ENTREGADO"],
        ENTREGADO: [],
    };
    return transitions[current]?.includes(next) ?? false;
}

export function isPaid(order: Order): boolean {
    return order.status !== "PENDIENTE";
}
