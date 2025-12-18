import { Request, Response } from 'express';
import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { CreateCategoryUseCase } from '@/core/application/categories/create-category.use-case';
import { GetCategoriesUseCase } from '@/core/application/categories/get-categories.use-case';
import { UpdateCategoryUseCase } from '@/core/application/categories/update-category.use-case';
import { DeleteCategoryUseCase } from '@/core/application/categories/delete-category.use-case';
import { GetCategoryStatsUseCase } from '@/core/application/categories/get-category-stats.use-case';

export class CategoryController {
    constructor(private categoryRepository: ICategoryRepository) { }

    create = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const useCase = new CreateCategoryUseCase(this.categoryRepository);
        const result = await useCase.execute(tenantId, req.body);
        return res.status(result.code).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const page = req.query.page ? parseInt(req.query.page as string) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

        const useCase = new GetCategoriesUseCase(this.categoryRepository);
        const result = await useCase.execute(tenantId, page, limit);
        return res.status(result.code).json(result);
    }

    getById = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new GetCategoriesUseCase(this.categoryRepository);
        const result = await useCase.executeById(tenantId, id);
        return res.status(result.code).json(result);
    }

    update = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new UpdateCategoryUseCase(this.categoryRepository);
        const result = await useCase.execute(tenantId, id, req.body);
        return res.status(result.code).json(result);
    }

    delete = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const { id } = req.params;
        const useCase = new DeleteCategoryUseCase(this.categoryRepository);
        const result = await useCase.execute(tenantId, id);
        return res.status(result.code).json(result);
    }

    getStats = async (req: Request, res: Response) => {
        const tenantId = (req as any).tenantId;
        const useCase = new GetCategoryStatsUseCase(this.categoryRepository);
        const result = await useCase.execute(tenantId);
        return res.status(result.code).json(result);
    }
}
