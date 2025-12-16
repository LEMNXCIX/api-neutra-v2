import { Request, Response } from 'express';
import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { GetAllProductsUseCase } from '@/core/application/products/get-all-products.use-case';
import { GetProductUseCase } from '@/core/application/products/get-product.use-case';
import { CreateProductUseCase } from '@/core/application/products/create-product.use-case';
import { UpdateProductUseCase } from '@/core/application/products/update-product.use-case';
import { DeleteProductUseCase } from '@/core/application/products/delete-product.use-case';
import { SearchProductsUseCase } from '@/core/application/products/search-products.use-case';
import { GetProductStatsUseCase } from '@/core/application/products/get-product-stats.use-case';
import { GetProductSummaryStatsUseCase } from '@/core/application/products/get-product-summary-stats.use-case';

import { MAX_IMAGE_SIZE_BYTES } from '@/config/constants.config';

export class ProductController {
    private getAllProductsUseCase: GetAllProductsUseCase;
    private getProductUseCase: GetProductUseCase;
    private createProductUseCase: CreateProductUseCase;
    private updateProductUseCase: UpdateProductUseCase;
    private deleteProductUseCase: DeleteProductUseCase;
    private searchProductsUseCase: SearchProductsUseCase;
    private getProductStatsUseCase: GetProductStatsUseCase;
    private productRepository: IProductRepository;

    constructor(productRepository: IProductRepository) {
        this.productRepository = productRepository;
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
        this.getSummaryStats = this.getSummaryStats.bind(this);
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

    private validateImageSize(base64String: string): boolean {
        // Remove header if present (e.g., "data:image/jpeg;base64,")
        const base64 = base64String.split(',')[1] || base64String;
        // Calculate size: each character is 6 bits (3/4 byte). Padding '='
        const sizeInBytes = (base64.length * 3) / 4 - (base64.indexOf('=') > 0 ? (base64.length - base64.indexOf('=')) : 0);
        return sizeInBytes <= MAX_IMAGE_SIZE_BYTES;
    }

    async create(req: Request, res: Response) {
        if (req.body.price < 0 || req.body.stock < 0) {
            return res.status(400).json({
                success: false,
                message: 'No se permiten valores negativos para precio o stock.'
            });
        }

        if (req.body.image && !this.validateImageSize(req.body.image)) {
            return res.status(400).json({
                success: false,
                message: 'La imagen excede el tamaño máximo permitido de 5MB.'
            });
        }

        if (req.body.price < 0 || req.body.stock < 0) {
            return res.status(400).json({
                success: false,
                message: 'No se permiten valores negativos para precio o stock.'
            });
        }

        const result = await this.createProductUseCase.execute({
            ...req.body,
            owner: (req as any).user.id
        });
        return res.json(result);
    }

    async update(req: Request, res: Response) {
        if ((req.body.price !== undefined && req.body.price < 0) || (req.body.stock !== undefined && req.body.stock < 0)) {
            return res.status(400).json({
                success: false,
                message: 'No se permiten valores negativos para precio o stock.'
            });
        }

        if (req.body.image && !this.validateImageSize(req.body.image)) {
            return res.status(400).json({
                success: false,
                message: 'La imagen excede el tamaño máximo permitido de 5MB.'
            });
        }

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

    async getSummaryStats(req: Request, res: Response) {
        const useCase = new GetProductSummaryStatsUseCase(this.productRepository);
        const result = await useCase.execute();
        return res.json(result);
    }
}
