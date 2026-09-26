import { CouponType } from "@/core/entities/coupon.entity";
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from "class-validator";

export interface CreateCouponDTO {
    code: string;
    type: CouponType;
    value: number;
    description?: string;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    active?: boolean;
    expiresAt: Date | string;
    applicableProducts?: string[];
    applicableCategories?: string[];
    applicableServices?: string[];
}

export interface UpdateCouponDTO {
    code?: string;
    type?: CouponType;
    value?: number;
    description?: string;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    active?: boolean;
    expiresAt?: Date | string;
    applicableProducts?: string[];
    applicableCategories?: string[];
}

export interface ValidateCouponDTO {
    code: string;
    orderTotal: number;
    productIds?: string[];
    categoryIds?: string[];
    serviceIds?: string[];
}

/**
 * The twelve fields of `CreateCouponData`, which is what
 * `PrismaCouponRepository.create` actually copies. The three applicability
 * lists are the coupon's own reach: a coupon created with an
 * `applicableServices` list is how the booking flow gets a service discount,
 * so they are part of this body rather than an afterthought.
 */
export class CreateCouponDto implements CreateCouponDTO {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsEnum(CouponType)
    type!: CouponType;

    @IsNumber()
    @Min(0)
    value!: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minPurchaseAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxDiscountAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    usageLimit?: number;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsDateString()
    expiresAt!: Date | string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    applicableProducts?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    applicableCategories?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    applicableServices?: string[];
}

/**
 * Eleven fields, not twelve: `PrismaCouponRepository.update` has no
 * `applicableServices` branch, so a create-only list must not look writable
 * here. Mirroring the repository rather than `CreateCouponDTO` is the point.
 */
export class UpdateCouponDto implements UpdateCouponDTO {
    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsEnum(CouponType)
    type?: CouponType;

    @IsOptional()
    @IsNumber()
    @Min(0)
    value?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minPurchaseAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxDiscountAmount?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    usageLimit?: number;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsDateString()
    expiresAt?: Date | string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    applicableProducts?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    applicableCategories?: string[];
}

/** The body of `POST /api/coupons/validate`, read by `ValidateCouponUseCase`. */
export class ValidateCouponDto implements ValidateCouponDTO {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsNumber()
    @Min(0)
    orderTotal!: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    productIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categoryIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    serviceIds?: string[];
}
