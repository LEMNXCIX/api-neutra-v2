import { Service } from "@/core/entities/service.entity";
import {
    ServiceResponse,
    IServiceResponse,
} from "@/core/application/dtos/responses/service/service.response";

export class ServicePresenter {
    static toResponse(service: Service): IServiceResponse {
        return ServiceResponse.fromEntity(service);
    }

    static toResponseList(services: Service[]): IServiceResponse[] {
        return services.map((s) => ServiceResponse.fromEntity(s));
    }
}
