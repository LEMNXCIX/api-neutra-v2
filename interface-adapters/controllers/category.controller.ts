import { Request, Response } from "express";
import { CreateCategoryUseCase } from "@/core/application/categories/create-category.use-case";
import { GetCategoriesUseCase } from "@/core/application/categories/get-categories.use-case";
import { UpdateCategoryUseCase } from "@/core/application/categories/update-category.use-case";
import { DeleteCategoryUseCase } from "@/core/application/categories/delete-category.use-case";
import { GetCategoryStatsUseCase } from "@/core/application/categories/get-category-stats.use-case";

import { CategoryType } from "@/core/entities/category.entity";
import { CategoryPresenter } from "@/core/presenters/category.presenter";
import { present } from "@/core/utils/use-case-result";

export class CategoryController {
    constructor(
        private createCategoryUseCase: CreateCategoryUseCase,
        private getCategoriesUseCase: GetCategoriesUseCase,
        private updateCategoryUseCase: UpdateCategoryUseCase,
        private deleteCategoryUseCase: DeleteCategoryUseCase,
        private getCategoryStatsUseCase: GetCategoryStatsUseCase,
    ) {}

    create = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.createCategoryUseCase.execute(
            tenantId,
            req.body,
        );
        return res
            .status(201)
            .json(present(result, CategoryPresenter.toResponse));
    };

    getAll = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const page = req.query.page
            ? parseInt(req.query.page as string)
            : undefined;
        const limit = req.query.limit
            ? parseInt(req.query.limit as string)
            : undefined;
        const rawType = req.query.type as string | undefined;
        const validTypes = Object.values(CategoryType) as string[];

        if (rawType && !validTypes.includes(rawType)) {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
            });
        }

        const type = rawType as CategoryType | undefined;

        const result = await this.getCategoriesUseCase.execute(
            tenantId,
            page,
            limit,
            type,
        );
        return res.json(present(result, CategoryPresenter.toResponseList));
    };

    getById = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.getCategoriesUseCase.executeById(
            tenantId,
            id,
        );
        return res.json(present(result, CategoryPresenter.toResponse));
    };

    update = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.updateCategoryUseCase.execute(
            tenantId,
            id,
            req.body,
        );
        return res.json(present(result, CategoryPresenter.toResponse));
    };

    delete = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const { id } = req.params;
        const result = await this.deleteCategoryUseCase.execute(tenantId, id);
        return res.json(result);
    };

    getStats = async (req: Request, res: Response) => {
        const tenantId = req.tenantId!;
        const result = await this.getCategoryStatsUseCase.execute(tenantId);
        return res.json(result);
    };
}
