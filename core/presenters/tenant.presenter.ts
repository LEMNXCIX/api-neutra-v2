import { Tenant } from "@/core/entities/tenant.entity";
import {
    TenantResponse,
    ITenantResponse,
} from "@/core/application/dtos/responses/tenant/tenant.response";

export class TenantPresenter {
    static toResponse(tenant: Tenant): ITenantResponse {
        return TenantResponse.fromEntity(tenant);
    }

    static toResponseList(tenants: Tenant[]): ITenantResponse[] {
        return tenants.map((t) => TenantResponse.fromEntity(t));
    }
}
