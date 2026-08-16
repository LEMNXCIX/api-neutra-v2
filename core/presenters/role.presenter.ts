import { Role } from "@/core/entities/role.entity";
import {
    RoleResponse,
    IRoleResponse,
} from "@/core/application/dtos/responses/role/role.response";

export class RolePresenter {
    static toResponse(role: Role): IRoleResponse {
        return RoleResponse.fromEntity(role);
    }

    static toResponseList(roles: Role[]): IRoleResponse[] {
        if (!Array.isArray(roles)) return [];
        return roles.map((r) => RoleResponse.fromEntity(r));
    }
}
