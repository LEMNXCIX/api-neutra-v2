import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
} from "class-validator";

export interface CreatePermissionDTO {
    name: string;
    description?: string;
    active?: boolean;
}

export interface UpdatePermissionDTO {
    name?: string;
    description?: string;
    active?: boolean;
}

/** The three fields of `PermissionCreateData`, the repository's own allowlist. */
export class CreatePermissionDto implements CreatePermissionDTO {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

export class UpdatePermissionDto implements UpdatePermissionDTO {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
