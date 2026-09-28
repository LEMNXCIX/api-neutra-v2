import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";
import type { Order, OrderStatus } from "@/core/entities/order.entity";
import { BusinessErrorCodes } from "@/types/error-codes";

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

const INSUFFICIENT_STOCK = BusinessErrorCodes.INSUFFICIENT_STOCK;

/** Add-to-cart: the resulting cart quantity must fit in the stock on hand. */
export function assertCartStockAvailable(input: {
    stock: number;
    cartQuantity: number;
    requestedQuantity: number;
    totalQuantity: number;
}): void {
    if (input.stock < input.totalQuantity) {
        const availableToAdd = Math.max(0, input.stock - input.cartQuantity);
        throw new BusinessRuleViolationError(
            input.cartQuantity > 0
                ? `Cannot add ${input.requestedQuantity} items. Only ${availableToAdd} more available (${input.stock} total stock, ${input.cartQuantity} already in cart)`
                : `Insufficient stock. Only ${input.stock} items available`,
            INSUFFICIENT_STOCK,
        );
    }
}

/**
 * Order commit: the guarded stock decrement (whose where clause requires
 * stock >= amount) matched no row, so the reservation failed. This is not the
 * cart-time rule of assertCartStockAvailable: the evidence is a write, and the
 * stock may have moved since the cart was filled.
 */
export function rejectInsufficientStock(productId: string): never {
    throw new BusinessRuleViolationError(
        `Stock insuficiente para el producto ${productId}`,
        INSUFFICIENT_STOCK,
    );
}
