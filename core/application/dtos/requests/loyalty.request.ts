import {
    IsInt,
    IsOptional,
    IsString,
    Min,
} from "class-validator";
import { Transform } from "class-transformer";

export interface UpdateLoyaltyConfigDTO {
    targetPoints?: number;
    rewardCouponId?: string | null;
}

export class UpdateLoyaltyConfigDto implements UpdateLoyaltyConfigDTO {
    @IsOptional()
    @IsInt()
    @Min(1)
    targetPoints?: number;

    @IsOptional()
    @IsString()
    @Transform(({ value }) =>
        typeof value === "string" ? value.trim() : value,
    )
    rewardCouponId?: string | null;
}
