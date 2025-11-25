import { Request, Response } from 'express';
import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { CreateCategoryUseCase } from '@/use-cases/categories/create-category.use-case';
import { GetCategoriesUseCase } from '@/use-cases/categories/get-categories.use-case';
import { UpdateCategoryUseCase } from '@/use-cases/categories/update-category.use-case';
import { DeleteCategoryUseCase } from '@/use-cases/categories/delete-category.use-case';

export class CategoryController {
    constructor(private categoryRepository: ICategoryRepository) { }

    create = async (req: Request, res: Response) => {
        const useCase = new CreateCategoryUseCase(this.categoryRepository);
        const result = await useCase.execute(req.body);
        return res.status(result.code).json(result);
    }

    getAll = async (req: Request, res: Response) => {
        const useCase = new GetCategoriesUseCase(this.categoryRepository);
        const result = await useCase.execute();
        return res.status(result.code).json(result);
    }

    getById = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new GetCategoriesUseCase(this.categoryRepository);
        const result = await useCase.executeById(id);
        return res.status(result.code).json(result);
    }

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new UpdateCategoryUseCase(this.categoryRepository);
        const result = await useCase.execute(id, req.body);
        return res.status(result.code).json(result);
    }

    delete = async (req: Request, res: Response) => {
        const { id } = req.params;
        const useCase = new DeleteCategoryUseCase(this.categoryRepository);
        const result = await useCase.execute(id);
        return res.status(result.code).json(result);
    }
}
