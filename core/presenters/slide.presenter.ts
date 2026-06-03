import {
    SlideResponse,
    ISlideResponse,
} from "@/core/application/dtos/responses/slide/slide.response";

export class SlidePresenter {
    static toResponse(slide: any): ISlideResponse {
        return SlideResponse.fromEntity(slide);
    }

    static toResponseList(slides: any[]): ISlideResponse[] {
        return slides.map((s) => SlideResponse.fromEntity(s));
    }
}
