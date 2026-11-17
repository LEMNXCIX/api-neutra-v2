import {
    IsDateString,
    IsIn,
    IsOptional,
    IsString,
    Matches,
} from "class-validator";

/** Positive integer as it arrives in a query string; parsePagination converts it. */
const POSITIVE_INT = /^[1-9]\d*$/;

export class PagedQueryDto {
    @IsOptional()
    @Matches(POSITIVE_INT)
    page?: string;

    @IsOptional()
    @Matches(POSITIVE_INT)
    limit?: string;
}

export class PagedSearchQueryDto extends PagedQueryDto {
    @IsOptional()
    @IsString()
    search?: string;
}

export class CategoryListQueryDto extends PagedQueryDto {
    /** Enum membership is still checked in the controller (existing 400 body). */
    @IsOptional()
    @IsString()
    type?: string;
}

export class CouponListQueryDto extends PagedSearchQueryDto {
    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    status?: string;
}

export class DatedQueryDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class OrderListQueryDto extends PagedSearchQueryDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class OrderStatusQueryDto {
    @IsOptional()
    @IsString()
    status?: string;
}

export class LogListQueryDto extends DatedQueryDto {
    @IsOptional()
    @IsString()
    level?: string;

    @IsOptional()
    @IsString()
    tenantId?: string;

    @IsOptional()
    @Matches(POSITIVE_INT)
    skip?: string;

    @IsOptional()
    @Matches(POSITIVE_INT)
    take?: string;
}

export class SimpleQueryDto {
    @IsOptional()
    @IsString()
    timeframe?: string;
}

/** `activeOnly` is a literal boolean flag, not any truthy string. */
export class ActiveOnlyQueryDto {
    @IsOptional()
    @IsIn(["true", "false"])
    activeOnly?: string;
}
