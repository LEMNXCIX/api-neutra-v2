import { Product } from "@/core/entities/product.entity";

export type OrderStatus = "PENDIENTE" | "PAGADO" | "ENVIADO" | "ENTREGADO"; // Matches Prisma Enum

export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    amount: number;
    price: number;
    product?: Product;
}

export interface Order {
    id: string;
    userId: string;
    status: OrderStatus;
    items: OrderItem[];
    subtotal: number;
    total: number;
    discountAmount: number;
    couponId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    user?: {
        name: string;
        email: string;
    };
    trackingNumber?: string | null;
}

export interface CreateOrderDTO {
    userId: string;
    items: {
        productId: string;
        amount: number;
        price: number;
    }[];
    couponId?: string;
}

export interface UpdateOrderDTO {
    status?: OrderStatus;
    trackingNumber?: string;
}
