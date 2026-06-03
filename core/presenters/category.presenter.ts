import {
    CategoryResponse,
    ICategoryResponse,
} from "@/core/application/dtos/responses/category/category.response";

export class CategoryPresenter {
    static toResponse(category: any): ICategoryResponse {
        return CategoryResponse.fromEntity(category);
    }

    static toResponseList(categories: any[]): ICategoryResponse[] {
        return categories.map((c) => CategoryResponse.fromEntity(c));
    }
}
