import {
    TenantResponse,
    ITenantResponse,
} from "@/core/application/dtos/responses/tenant/tenant.response";

export class TenantPresenter {
    static toResponse(tenant: any): ITenantResponse {
        return TenantResponse.fromEntity(tenant);
    }

    static toResponseList(tenants: any[]): ITenantResponse[] {
        return tenants.map((t) => TenantResponse.fromEntity(t));
    }
}
