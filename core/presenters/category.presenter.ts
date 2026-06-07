import {
    CategoryResponse,
    ICategoryResponse,
} from "@/core/application/dtos/responses/category/category.response";
import { Category } from "@/core/entities/category.entity";

export class CategoryPresenter {
    static toResponse(category: Category): ICategoryResponse {
        return CategoryResponse.fromEntity(category);
    }

    static toResponseList(categories: Category[]): ICategoryResponse[] {
        return categories.map((c) => CategoryResponse.fromEntity(c));
    }
}
