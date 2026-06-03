import {
    UserResponse,
    IUserResponse,
} from "@/core/application/dtos/responses/user/user.response";
import {
    UserPublicResponse,
    IUserPublicResponse,
} from "@/core/application/dtos/responses/user/user-public.response";
import {
    UserMinimalResponse,
    IUserMinimalResponse,
} from "@/core/application/dtos/responses/shared/user-minimal.response";

export class UserPresenter {
    static toResponse(user: any): IUserResponse {
        return UserResponse.fromEntity(user);
    }

    static toPublicResponse(user: any): IUserPublicResponse {
        return UserPublicResponse.fromEntity(user);
    }

    static toMinimalResponse(user: any): IUserMinimalResponse {
        return UserMinimalResponse.fromEntity(user);
    }

    static toResponseList(users: any[]): IUserResponse[] {
        return users.map((u) => UserResponse.fromEntity(u));
    }
}
