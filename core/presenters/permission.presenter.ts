import {
    PermissionResponse,
    IPermissionResponse,
} from "@/core/application/dtos/responses/permission/permission.response";

export class PermissionPresenter {
    static toResponse(permission: any): IPermissionResponse {
        return PermissionResponse.fromEntity(permission);
    }

    static toResponseList(permissions: any[]): IPermissionResponse[] {
        return permissions.map((p) => PermissionResponse.fromEntity(p));
    }
}
