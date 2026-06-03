export interface IServiceMinimalResponse {
    id: string;
    name: string;
    duration: number;
    price: number;
}

export class ServiceMinimalResponse {
    static fromEntity(service: any): IServiceMinimalResponse {
        return {
            id: service.id,
            name: service.name,
            duration: service.duration,
            price: service.price,
        };
    }
}
