import { Slideshow } from "@/core/entities/slide.entity";
import {
    SlideResponse,
    ISlideResponse,
} from "@/core/application/dtos/responses/slide/slide.response";

export class SlidePresenter {
    static toResponse(slide: Slideshow): ISlideResponse {
        return SlideResponse.fromEntity(slide);
    }

    static toResponseList(slides: Slideshow[]): ISlideResponse[] {
        return slides.map((s) => SlideResponse.fromEntity(s));
    }
}
