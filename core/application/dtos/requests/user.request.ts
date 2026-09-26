import {
    IsBoolean,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
} from "class-validator";

export interface CreateUserDTO {
    name: string;
    email: string;
    password?: string;
    profilePic?: string;
    phone?: string;
    pushToken?: string;
    active?: boolean;
    googleId?: string;
    facebookId?: string;
    twitterId?: string;
    githubId?: string;
}

/**
 * What a tenant admin may write on `PUT /api/users/:id`.
 *
 * `users.routes.ts` now carries `validateDto(UpdateUserDto)`, so the declared
 * fields are type-checked at the edge, and `UserController.update` narrows the
 * body down to exactly these six before the use case sees it. The tenant-scoped
 * repository allowlist repeats the same six, so a bypass at one layer cannot
 * widen the other.
 *
 * The provider ids and the reset pair are absent because the lookups behind
 * them — `findByProvider` and `findByResetToken` — carry no tenant: writing a
 * value the caller controls into one of those columns is enough for the
 * attacker's own social login or password reset to resolve this account.
 * `password` is absent for a different reason: the repository writes that
 * column verbatim, and only `reset-password` hashes before calling.
 *
 * `validateDto` runs `validate()` without `whitelist`, so an undeclared key in
 * the body still reaches the controller's narrowing. That is why the narrowing
 * stays and is not replaced by this class.
 */
export interface UpdateUserDTO {
    name?: string;
    email?: string;
    profilePic?: string;
    phone?: string;
    pushToken?: string;
    active?: boolean;
}

export interface AssignRoleDTO {
    roleId: string;
}

export interface ProviderDataDTO {
    provider: string;
    idProvider: string;
    name: string;
    email: string;
    profilePic?: string;
}

/** The six admin-safe columns, as a validator class for `PUT /api/users/:id`. */
export class UpdateUserDto implements UpdateUserDTO {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    profilePic?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    pushToken?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

/** The body of `PUT /api/users/:id/role`, read by `AssignRoleToUserUseCase`. */
export class AssignRoleDto implements AssignRoleDTO {
    @IsString()
    @IsNotEmpty()
    roleId!: string;
}

// `CreateUserDTO` and `ProviderDataDTO` have no class: `UserController.create`
// and `UserController.getOrCreateByProvider` are not mounted on any route, so
// nothing reads these fields off a request body today. Add classes with the
// route that mounts them.
