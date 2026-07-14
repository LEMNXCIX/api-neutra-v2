import { User } from "@/core/entities/user.entity";
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
    static toResponse(user: User): IUserResponse {
        return UserResponse.fromEntity(user);
    }

    static toPublicResponse(user: User): IUserPublicResponse {
        return UserPublicResponse.fromEntity(user);
    }

    static toMinimalResponse(user: User): IUserMinimalResponse {
        return UserMinimalResponse.fromEntity(user);
    }

    static toResponseList(users: User[]): IUserResponse[] {
        if (!Array.isArray(users)) return [];
        return users.map((u) => UserResponse.fromEntity(u));
    }
}
