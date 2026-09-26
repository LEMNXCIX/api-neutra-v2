import type { AuthenticatedUser } from "@/core/domain/auth.types";
import { ROLE_CONSTANTS } from "@/core/domain/constants";

/**
 * Access rules. The policy decides; the caller renders the transport answer.
 * Rules whose rejection carries a message return a decision, rules that are a
 * plain yes/no stay predicates.
 */

export function isSuperAdmin(user: AuthenticatedUser | undefined): boolean {
    return user?.role?.name === ROLE_CONSTANTS.SUPER_ADMIN;
}

export function hasPermission(
    user: AuthenticatedUser | undefined,
    permission: string,
): boolean {
    if (!user?.role) return false;
    if (isSuperAdmin(user)) return true;
    return user.role.permissions?.includes(permission) ?? false;
}

export function hasAnyRole(
    user: AuthenticatedUser | undefined,
    roles: readonly string[],
): boolean {
    if (!user?.role) return false;
    return isSuperAdmin(user) || roles.includes(user.role.name);
}

export type RoleLevelDecision =
    | { allowed: true }
    | { allowed: false; message: string };

/** The caller has already rejected a missing user and the SUPER_ADMIN bypass. */
export function evaluateRoleLevel(
    user: AuthenticatedUser,
    minLevel: number,
): RoleLevelDecision {
    if (user.role.level < minLevel) {
        return {
            allowed: false,
            message: `You need role level ${minLevel} or higher (current: ${user.role.level})`,
        };
    }
    return { allowed: true };
}
