import {
    RoleResponse,
    IRoleResponse,
} from "@/core/application/dtos/responses/role/role.response";

export class RolePresenter {
    static toResponse(role: any): IRoleResponse {
        return RoleResponse.fromEntity(role);
    }

    static toResponseList(roles: any[]): IRoleResponse[] {
        return roles.map((r) => RoleResponse.fromEntity(r));
    }
}
