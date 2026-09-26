import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from "class-validator";

export interface CreateProductDTO {
    name: string;
    description: string;
    image?: string;
    price: number;
    stock?: number;
    active?: boolean;
    ownerId: string;
    categoryIds?: string[];
}

export interface UpdateProductDTO {
    name?: string;
    description?: string;
    image?: string;
    price?: number;
    stock?: number;
    active?: boolean;
    categoryIds?: string[];
}

export interface SearchProductDTO {
    name: string;
}

/**
 * The body of `POST /api/products` is the client-settable half of
 * `CreateProductData`. `ownerId` is absent on purpose: it is the column
 * `ProductController.create` sets from `req.user.id` after the spread, so it is
 * a server-owned field and a body value for it can never win. The class does
 * not implement `CreateProductDTO` for the same reason.
 */
export class CreateProductDto {
    @IsString()
    name!: string;

    @IsString()
    description!: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsNumber()
    @Min(0)
    price!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categoryIds?: string[];
}

export class UpdateProductDto implements UpdateProductDTO {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categoryIds?: string[];
}

/** The body of the public `POST /api/products/search`. */
export class SearchProductDto implements SearchProductDTO {
    @IsString()
    name!: string;
}
