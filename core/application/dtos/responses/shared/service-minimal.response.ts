export interface IServiceMinimalResponse {
    id: string;
    name: string;
    duration: number;
    price: number;
}

export class ServiceMinimalResponse {
    static fromEntity(
        service: Pick<
            IServiceMinimalResponse,
            "id" | "name" | "duration" | "price"
        >,
    ): IServiceMinimalResponse {
        return {
            id: service.id,
            name: service.name,
            duration: service.duration,
            price: service.price,
        };
    }
}
