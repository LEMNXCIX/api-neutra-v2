import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
} from "class-validator";

export interface CreateSlideshowDTO {
    title: string;
    img: string;
    desc?: string;
    active?: boolean;
}

export interface UpdateSlideshowDTO {
    title?: string;
    img?: string;
    desc?: string;
    active?: boolean;
}

/** The four fields `SlideshowCreateData` carries, the repository's own copy list. */
export class CreateSlideshowDto implements CreateSlideshowDTO {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    img!: string;

    @IsOptional()
    @IsString()
    desc?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

export class UpdateSlideshowDto implements UpdateSlideshowDTO {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    img?: string;

    @IsOptional()
    @IsString()
    desc?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
