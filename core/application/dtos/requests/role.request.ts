import {
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
} from "class-validator";

export interface CreateRoleDTO {
    name: string;
    description?: string;
    level?: number;
    active?: boolean;
    permissionIds?: string[];
}

export interface UpdateRoleDTO {
    name?: string;
    description?: string;
    level?: number;
    active?: boolean;
    permissionIds?: string[];
}

/**
 * The five fields `RoleCreateData` carries, which is also the allowlist
 * `PrismaRoleRepository.create` copies. `tenantId` is not among them: the
 * repository takes the tenant from its first argument, so a `tenantId` in the
 * body is not what scopes a role.
 */
export class CreateRoleDto implements CreateRoleDTO {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    level?: number;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissionIds?: string[];
}

export class UpdateRoleDto implements UpdateRoleDTO {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    level?: number;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissionIds?: string[];
}
