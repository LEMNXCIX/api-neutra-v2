import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from "class-validator";

export interface CreateServiceDTO {
    name: string;
    description?: string;
    duration: number;
    price: number;
    categoryId?: string;
    active?: boolean;
}

export interface UpdateServiceDTO {
    name?: string;
    description?: string;
    duration?: number;
    price?: number;
    categoryId?: string;
    active?: boolean;
}

/**
 * `duration` is the only field `CreateServiceDTO` marks as a number rather
 * than a currency amount, and the repository derives `endTime` from it, so it
 * is asserted as an integer: a fractional duration would silently produce an
 * `endTime` the availability maths never rounds.
 */
export class CreateServiceDto implements CreateServiceDTO {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsInt()
    @Min(1)
    duration!: number;

    @IsNumber()
    @Min(0)
    price!: number;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

export class UpdateServiceDto implements UpdateServiceDTO {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    duration?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsString()
    categoryId?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
