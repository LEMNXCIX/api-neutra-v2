import { Request, Response } from 'express';
import { IProductRepository } from '../../core/repositories/product.repository.interface';
import { GetAllProductsUseCase } from '../../use-cases/products/get-all-products.use-case';
import { GetProductUseCase } from '../../use-cases/products/get-product.use-case';
import { CreateProductUseCase } from '../../use-cases/products/create-product.use-case';
import { UpdateProductUseCase } from '../../use-cases/products/update-product.use-case';
import { DeleteProductUseCase } from '../../use-cases/products/delete-product.use-case';
import { SearchProductsUseCase } from '../../use-cases/products/search-products.use-case';
import { GetProductStatsUseCase } from '../../use-cases/products/get-product-stats.use-case';

export class ProductController {
    private getAllProductsUseCase: GetAllProductsUseCase;
    private getProductUseCase: GetProductUseCase;
    private createProductUseCase: CreateProductUseCase;
    private updateProductUseCase: UpdateProductUseCase;
    private deleteProductUseCase: DeleteProductUseCase;
    private searchProductsUseCase: SearchProductsUseCase;
    private getProductStatsUseCase: GetProductStatsUseCase;

    constructor(productRepository: IProductRepository) {
        this.getAllProductsUseCase = new GetAllProductsUseCase(productRepository);
        this.getProductUseCase = new GetProductUseCase(productRepository);
        this.createProductUseCase = new CreateProductUseCase(productRepository);
        this.updateProductUseCase = new UpdateProductUseCase(productRepository);
        this.deleteProductUseCase = new DeleteProductUseCase(productRepository);
        this.searchProductsUseCase = new SearchProductsUseCase(productRepository);
        this.getProductStatsUseCase = new GetProductStatsUseCase(productRepository);

        // Bind methods
        this.getAll = this.getAll.bind(this);
        this.getOne = this.getOne.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.search = this.search.bind(this);
        this.getStats = this.getStats.bind(this);
    }

    async getAll(req: Request, res: Response) {
        const result = await this.getAllProductsUseCase.execute();
        return res.json(result);
    }

    async getOne(req: Request, res: Response) {
        const id = req.params.id;
        const result = await this.getProductUseCase.execute(id);
        return res.json(result);
    }

    async create(req: Request, res: Response) {
        const result = await this.createProductUseCase.execute({
            ...req.body,
            owner: (req as any).user.id
        });
        return res.json(result);
    }

    async update(req: Request, res: Response) {
        const id = req.params.id;
        const result = await this.updateProductUseCase.execute(id, req.body);
        return res.json(result);
    }

    async delete(req: Request, res: Response) {
        const id = req.params.id;
        const userId = (req as any).user.id;
        const result = await this.deleteProductUseCase.execute(id, userId);
        return res.json(result);
    }

    async search(req: Request, res: Response) {
        const name = req.body.name;
        const result = await this.searchProductsUseCase.execute(name);
        return res.json(result);
    }

    async getStats(req: Request, res: Response) {
        const result = await this.getProductStatsUseCase.execute();
        return res.json(result);
    }
}
