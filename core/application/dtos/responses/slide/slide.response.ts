import { Slideshow } from "@/core/entities/slide.entity";

export interface ISlideResponse {
    id: string;
    title: string;
    img: string;
    desc?: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class SlideResponse {
    static fromEntity(slideshow: Slideshow): ISlideResponse {
        return {
            id: slideshow.id,
            title: slideshow.title,
            img: slideshow.img,
            desc: slideshow.desc ?? null,
            active: slideshow.active,
            createdAt: slideshow.createdAt,
            updatedAt: slideshow.updatedAt,
        };
    }
}
