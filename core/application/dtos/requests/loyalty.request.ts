import {
    IsArray,
    IsDateString,
    IsDefined,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Min,
    Max,
    ValidateIf,
    ValidateNested,
} from "class-validator";
import { plainToInstance, Transform } from "class-transformer";
import { CouponType } from "@/core/entities/coupon.entity";
import {
    LoyaltyCampaignAction,
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
} from "@/core/entities/loyalty.entity";
import {
    MAX_LOYALTY_PRISMA_INT,
} from "@/core/domain/loyalty/loyalty.policy";

export interface LoyaltyRewardDefinitionDTO {
    type: CouponType;
    value: number;
    description?: string | null;
    minPurchaseAmount?: number | null;
    maxDiscountAmount?: number | null;
    applicableProducts?: string[];
    applicableCategories?: string[];
    applicableServices?: string[];
}

export class LoyaltyRewardDefinitionDto
    implements LoyaltyRewardDefinitionDTO
{
    @IsEnum(CouponType)
    type!: CouponType;

    @IsNumber()
    @Min(0)
    value!: number;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minPurchaseAmount?: number | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    maxDiscountAmount?: number | null;

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

export interface CreateLoyaltyCampaignDTO {
    name: string;
    description?: string | null;
    source: LoyaltyCampaignSource;
    metric: LoyaltyCampaignMetric;
    targetValue: string;
    startsAt: Date | string;
    endsAt: Date | string;
    claimUntil: Date | string;
    reward: LoyaltyRewardDefinitionDTO;
    rewardValidDays: number;
    maxClaims?: number | null;
}

export class CreateLoyaltyCampaignDto implements CreateLoyaltyCampaignDTO {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsEnum(LoyaltyCampaignSource)
    source!: LoyaltyCampaignSource;

    @IsEnum(LoyaltyCampaignMetric)
    metric!: LoyaltyCampaignMetric;

    @IsString()
    @IsNotEmpty()
    targetValue!: string;

    @IsDateString()
    startsAt!: Date | string;

    @IsDateString()
    endsAt!: Date | string;

    @IsDateString()
    claimUntil!: Date | string;

    @IsDefined()
    @IsObject()
    @ValidateNested()
    @Transform(
        ({ value }) =>
            plainToInstance(LoyaltyRewardDefinitionDto, value),
        { toClassOnly: true },
    )
    reward!: LoyaltyRewardDefinitionDto;

    @IsInt()
    @Min(1)
    @Max(MAX_LOYALTY_PRISMA_INT)
    rewardValidDays!: number;

    @IsOptional()
    @ValidateIf((_object, value) => value !== null)
    @IsInt()
    @Min(1)
    @Max(MAX_LOYALTY_PRISMA_INT)
    maxClaims?: number | null;
}

export interface UpdateLoyaltyCampaignDTO {
    name?: string;
    description?: string | null;
    source?: LoyaltyCampaignSource;
    metric?: LoyaltyCampaignMetric;
    targetValue?: string;
    startsAt?: Date | string;
    endsAt?: Date | string;
    claimUntil?: Date | string;
    reward?: LoyaltyRewardDefinitionDTO;
    rewardValidDays?: number;
    maxClaims?: number | null;
}

export class UpdateLoyaltyCampaignDto implements UpdateLoyaltyCampaignDTO {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsEnum(LoyaltyCampaignSource)
    source?: LoyaltyCampaignSource;

    @IsOptional()
    @IsEnum(LoyaltyCampaignMetric)
    metric?: LoyaltyCampaignMetric;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    targetValue?: string;

    @IsOptional()
    @IsDateString()
    startsAt?: Date | string;

    @IsOptional()
    @IsDateString()
    endsAt?: Date | string;

    @IsOptional()
    @IsDateString()
    claimUntil?: Date | string;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Transform(
        ({ value }) =>
            plainToInstance(LoyaltyRewardDefinitionDto, value),
        { toClassOnly: true },
    )
    reward?: LoyaltyRewardDefinitionDto;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(MAX_LOYALTY_PRISMA_INT)
    rewardValidDays?: number;

    @IsOptional()
    @ValidateIf((_object, value) => value !== null)
    @IsInt()
    @Min(1)
    @Max(MAX_LOYALTY_PRISMA_INT)
    maxClaims?: number | null;
}

export const LoyaltyCampaignLifecycleAction = LoyaltyCampaignAction;
export type LoyaltyCampaignLifecycleAction = LoyaltyCampaignAction;

export interface LoyaltyCampaignLifecycleDTO {
    action: LoyaltyCampaignLifecycleAction | "activate" | "end" | "archive" | "delete";
}

export class LoyaltyCampaignLifecycleDto
    implements LoyaltyCampaignLifecycleDTO
{
    @IsEnum(LoyaltyCampaignLifecycleAction)
    action!: LoyaltyCampaignLifecycleAction;
}

export type CreateLoyaltyCampaignRequest = CreateLoyaltyCampaignDTO;
export type UpdateLoyaltyCampaignRequest = UpdateLoyaltyCampaignDTO;
export type LoyaltyCampaignRewardDefinition = LoyaltyRewardDefinitionDTO;
export type LoyaltyCampaignRewardDTO = LoyaltyRewardDefinitionDTO;
export type CreateCampaignDTO = CreateLoyaltyCampaignDTO;
export type UpdateCampaignDTO = UpdateLoyaltyCampaignDTO;
