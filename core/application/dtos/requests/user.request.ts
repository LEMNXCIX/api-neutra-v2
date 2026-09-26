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
 * `users.routes.ts` carries no `validateDto`, so the controller narrows an
 * arbitrary body down to exactly these six before the use case sees it, and
 * the tenant-scoped repository allowlist repeats the same six so a bypass at
 * one layer cannot widen the other.
 *
 * The provider ids and the reset pair are absent because the lookups behind
 * them — `findByProvider` and `findByResetToken` — carry no tenant: writing a
 * value the caller controls into one of those columns is enough for the
 * attacker's own social login or password reset to resolve this account.
 * `password` is absent for a different reason: the repository writes that
 * column verbatim, and only `reset-password` hashes before calling.
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
