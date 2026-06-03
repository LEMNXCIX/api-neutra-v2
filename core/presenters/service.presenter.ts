import {
    ServiceResponse,
    IServiceResponse,
} from "@/core/application/dtos/responses/service/service.response";
import {
    ServiceMinimalResponse,
    IServiceMinimalResponse,
} from "@/core/application/dtos/responses/shared/service-minimal.response";

export class ServicePresenter {
    static toResponse(service: any): IServiceResponse {
        return ServiceResponse.fromEntity(service);
    }

    static toMinimalResponse(service: any): IServiceMinimalResponse {
        return ServiceMinimalResponse.fromEntity(service);
    }

    static toResponseList(services: any[]): IServiceResponse[] {
        return services.map((s) => ServiceResponse.fromEntity(s));
    }
}
