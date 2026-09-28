import {
    IsBoolean,
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
} from "class-validator";

export interface CreateBannerDTO {
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    cta?: string;
    ctaUrl?: string;
    priority?: number;
    active?: boolean;
    startsAt: Date | string;
    endsAt: Date | string;
}

export interface UpdateBannerDTO {
    title?: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    cta?: string;
    ctaUrl?: string;
    priority?: number;
    active?: boolean;
    startsAt?: Date | string;
    endsAt?: Date | string;
}

/**
 * The twelve columns `PrismaBannerRepository.create` copies, in the same order
 * as `BannerCreateData`. `tenantId` is not among them: the repository takes the
 * tenant from its first argument, so a `tenantId` in the body is not what scopes
 * a banner.
 */
export class CreateBannerDto implements CreateBannerDTO {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsOptional()
    @IsString()
    subtitle?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsString()
    backgroundColor?: string;

    @IsOptional()
    @IsString()
    textColor?: string;

    @IsOptional()
    @IsString()
    cta?: string;

    @IsOptional()
    @IsString()
    ctaUrl?: string;

    @IsOptional()
    @IsInt()
    priority?: number;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsDateString()
    startsAt!: Date | string;

    @IsDateString()
    endsAt!: Date | string;
}

/** The same twelve, all optional: the repository's update allowlist. */
export class UpdateBannerDto implements UpdateBannerDTO {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    subtitle?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsString()
    backgroundColor?: string;

    @IsOptional()
    @IsString()
    textColor?: string;

    @IsOptional()
    @IsString()
    cta?: string;

    @IsOptional()
    @IsString()
    ctaUrl?: string;

    @IsOptional()
    @IsInt()
    priority?: number;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsDateString()
    startsAt?: Date | string;

    @IsOptional()
    @IsDateString()
    endsAt?: Date | string;
}
