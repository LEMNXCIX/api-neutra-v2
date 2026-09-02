import {
    IsBoolean,
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from "class-validator";
import { TenantType, TenantConfig } from "@/core/entities/tenant.entity";

export class CreateTenantDto {
    @IsString()
    @MinLength(2, { message: "Name must be at least 2 characters" })
    @MaxLength(100)
    name!: string;

    @IsString()
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: "Slug must be lowercase alphanumeric with dashes",
    })
    @MinLength(2)
    @MaxLength(63)
    slug!: string;

    @IsEnum(TenantType)
    type!: TenantType;

    @IsOptional()
    @IsObject()
    config?: TenantConfig;
}

export class UpdateTenantDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsString()
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: "Slug must be lowercase alphanumeric with dashes",
    })
    @MaxLength(63)
    slug?: string;

    @IsOptional()
    @IsEnum(TenantType)
    type?: TenantType;

    @IsOptional()
    @IsObject()
    config?: Partial<TenantConfig>;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

export class UpdateTenantFeaturesDto {
    @IsObject()
    features!: Record<string, boolean>;
}
