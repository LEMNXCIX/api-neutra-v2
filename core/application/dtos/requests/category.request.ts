import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
} from "class-validator";
import { CategoryType } from "@/core/entities/category.entity";

export interface CreateCategoryDTO {
    name: string;
    description?: string;
    type?: CategoryType;
    active?: boolean;
}

export interface UpdateCategoryDTO {
    name?: string;
    description?: string;
    type?: CategoryType;
    active?: boolean;
}

/** The four columns `PrismaCategoryRepository.create` copies. */
export class CreateCategoryDto implements CreateCategoryDTO {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(CategoryType)
    type?: CategoryType;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

export class UpdateCategoryDto implements UpdateCategoryDTO {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(CategoryType)
    type?: CategoryType;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
