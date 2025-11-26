import { Product } from '@/core/entities/product.entity';

export type OrderStatus = 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO'; // Adjust based on Prisma Enum if needed

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
    createdAt: Date;
    updatedAt: Date;
    user?: {
        name: string;
        email: string;
    };
}

export interface CreateOrderDTO {
    userId: string;
    items: {
        productId: string;
        amount: number;
        price: number;
    }[];
}
