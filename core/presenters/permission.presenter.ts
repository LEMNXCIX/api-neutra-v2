import { Permission } from "@/core/entities/permission.entity";
import {
    PermissionResponse,
    IPermissionResponse,
} from "@/core/application/dtos/responses/permission/permission.response";

export class PermissionPresenter {
    static toResponse(permission: Permission): IPermissionResponse {
        return PermissionResponse.fromEntity(permission);
    }

    static toResponseList(permissions: Permission[]): IPermissionResponse[] {
        if (!Array.isArray(permissions)) return [];
        return permissions.map((p) => PermissionResponse.fromEntity(p));
    }
}
