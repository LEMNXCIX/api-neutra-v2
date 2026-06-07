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
