import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export interface LoginDTO {
    email: string;
    password: string;
}

export interface ForgotPasswordDTO {
    email: string;
}

export interface ResetPasswordDTO {
    token: string;
    newPassword: string;
}

export interface SocialLoginDTO {
    provider: string;
    id: string;
    displayName?: string;
    emails?: Array<{ value: string }>;
    photos?: Array<{ value: string }>;
}

/**
 * Validator classes for the auth routes that take a body. `LoginDto` and
 * `CreateUserDto` already exist in `@/types/request-dto` and are wired to the
 * login and signup routes; these two had only the interfaces above, which are
 * erased at compile time and so constrained nothing. They live here rather than
 * in `types/` because that file is the odd home the convention is moving away
 * from, and a class per body is the convention the other write routes follow.
 */
export class ForgotPasswordDto implements ForgotPasswordDTO {
    @IsEmail()
    email!: string;
}

export class ResetPasswordDto implements ResetPasswordDTO {
    @IsString()
    @IsNotEmpty()
    token!: string;

    @IsString()
    @MinLength(8)
    newPassword!: string;
}
