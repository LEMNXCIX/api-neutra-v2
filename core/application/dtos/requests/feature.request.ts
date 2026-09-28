import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export interface CreateFeatureDTO {
    key: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
}

export interface UpdateFeatureDTO {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
}

/**
 * The five columns `IFeatureRepository.create` copies. `key` is included
 * because the catalog is keyed by it; `UpdateFeatureDto` deliberately omits
 * it, because `key` is the join key every `TenantFeature` row and every stored
 * `config.features` map is written by.
 */
export class CreateFeatureDto implements CreateFeatureDTO {
    @IsString()
    key!: string;

    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;
}

export class UpdateFeatureDto implements UpdateFeatureDTO {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;
}
