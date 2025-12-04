import { OrderStatus } from '@/core/entities/order.entity';

export class GetOrderStatusesUseCase {
    execute() {
        const statuses = [
            { value: 'PENDIENTE', label: 'Pendiente' },
            { value: 'PAGADO', label: 'Pagado' },
            { value: 'ENVIADO', label: 'Enviado' },
            { value: 'ENTREGADO', label: 'Entregado' }
        ];
        return {
            success: true,
            code: 200,
            message: "Order statuses retrieved successfully",
            data: statuses
        };
    }
}
